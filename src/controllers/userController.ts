import { Request, Response } from "express";
import { User, UserRole, IUser, PhoneVerification } from "../models";

// Register a new user
export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      userRole,
      phoneNumber,
      registrationMethod,
    } = req.body;

    // Validate registration method
    if (
      !registrationMethod ||
      !["email", "phone"].includes(registrationMethod)
    ) {
      res.status(400).json({
        success: false,
        message: "Registration method must be either 'email' or 'phone'",
      });
      return;
    }

    // Validate common required fields
    if (!name || !userRole) {
      res.status(400).json({
        success: false,
        message: "Name and user role are required",
      });
      return;
    }

    // Email-based registration
    if (registrationMethod === "email") {
      if (!email || !password || !confirmPassword) {
        res.status(400).json({
          success: false,
          message:
            "Email, password, and confirm password are required for email registration",
        });
        return;
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: "Password and confirm password do not match",
        });
        return;
      }

      // Validate password length
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
        return;
      }

      // Check if user already exists by email
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
        return;
      }

      // Create new user with email
      const newUser = new User({
        name,
        email,
        password, // Hash in real app
        userRole: userRole || UserRole.TRAVELLER,
        phoneNumber: phoneNumber || null, // Optional for email registration
        isPhoneVerified: false,
        isEmailVerified: true, // Email is verified since they registered with email
      });

      const savedUser = await newUser.save();

      res.status(201).json({
        success: true,
        message: "User registered successfully with email",
        data: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          phoneNumber: savedUser.phoneNumber,
          isPhoneVerified: savedUser.isPhoneVerified,
          isEmailVerified: savedUser.isEmailVerified,
          userRole: savedUser.userRole,
          createdAt: savedUser.createdAt,
        },
      });
      return;
    }

    // Phone-based registration
    if (registrationMethod === "phone") {
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: "Phone number is required for phone registration",
        });
        return;
      }

      // Check if user already exists by phone number
      const existingUserByPhone = await User.findOne({ phoneNumber });
      if (existingUserByPhone) {
        res.status(400).json({
          success: false,
          message: "User with this phone number already exists",
        });
        return;
      }

      // Check if phone number is verified
      const verification = await PhoneVerification.findOne({
        phoneNumber,
        isUsed: true,
        expiresAt: { $gt: new Date() },
      });

      if (!verification) {
        res.status(400).json({
          success: false,
          message:
            "Phone number must be verified before registration. Please verify your phone number first.",
        });
        return;
      }

      // Create new user with phone
      const newUser = new User({
        name,
        email: email || null, // Optional for phone registration
        password: null, // No password for phone registration
        phoneNumber,
        isPhoneVerified: true,
        isEmailVerified: false, // Email verification pending for phone registration
        userRole: userRole || UserRole.TRAVELLER,
      });

      const savedUser = await newUser.save();

      res.status(201).json({
        success: true,
        message: "User registered successfully with phone verification",
        data: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          phoneNumber: savedUser.phoneNumber,
          isPhoneVerified: savedUser.isPhoneVerified,
          isEmailVerified: savedUser.isEmailVerified,
          userRole: savedUser.userRole,
          createdAt: savedUser.createdAt,
        },
      });
      return;
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
    return;
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, phoneNumber, loginMethod } = req.body;

    // Validate login method
    if (!loginMethod || !["email", "phone"].includes(loginMethod)) {
      res.status(400).json({
        success: false,
        message: "Login method must be either 'email' or 'phone'",
      });
      return;
    }

    // Email-based login
    if (loginMethod === "email") {
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: "Email and password are required for email login",
        });
        return;
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Check if user has password (email-based registration)
      if (!user.password) {
        res.status(401).json({
          success: false,
          message:
            "This account was registered with phone number. Please use phone login.",
        });
        return;
      }

      // Check password (in a real app, you'd compare hashed passwords)
      if (user.password !== password) {
        res.status(401).json({
          success: false,
          message: "Invalid password",
        });
        return;
      }

      // Return user data (in a real app, you'd add JWT token here)
      res.status(200).json({
        success: true,
        message: "Login successful with email",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
          userRole: user.userRole,
          createdAt: user.createdAt,
        },
      });
      return;
    }

    // Phone-based login
    if (loginMethod === "phone") {
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: "Phone number is required for phone login",
        });
        return;
      }

      // Find user by phone number
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Check if phone is verified
      if (!user.isPhoneVerified) {
        res.status(401).json({
          success: false,
          message:
            "Phone number is not verified. Please verify your phone number first.",
        });
        return;
      }

      // Return user data (in a real app, you'd add JWT token here)
      res.status(200).json({
        success: true,
        message: "Login successful with phone",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
          userRole: user.userRole,
          createdAt: user.createdAt,
        },
      });
      return;
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
    return;
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find({}).select("-__v");

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      count: users.length,
      data: users,
    });
    return;
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching users",
    });
    return;
  }
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-__v");
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
    return;
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user",
    });
    return;
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, userRole } = req.body;

    const existingUser = await User.findById(id);
    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        res.status(400).json({
          success: false,
          message: "Email already exists",
        });
        return;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        name: name || existingUser.name,
        email: email || existingUser.email,
        userRole: userRole || existingUser.userRole,
      },
      { new: true, runValidators: true }
    ).select("-__v");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
    return;
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating user",
    });
    return;
  }
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
    return;
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting user",
    });
    return;
  }
};

export const getUsersByRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.params;

    if (!Object.values(UserRole).includes(role as UserRole)) {
      res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'owner', 'host', or 'traveller'",
      });
      return;
    }

    const users = await User.find({ userRole: role }).select("-__v");

    res.status(200).json({
      success: true,
      message: `Users with role '${role}' retrieved successfully`,
      count: users.length,
      data: users,
    });
    return;
  } catch (error) {
    console.error("Get users by role error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching users by role",
    });
    return;
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    const user = await User.findById(userId).select("-__v");
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: user,
    });
    return;
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user profile",
    });
    return;
  }
};
