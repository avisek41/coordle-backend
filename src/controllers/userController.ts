import { Request, Response } from "express";
import { User, UserRole, IUser } from "../models";

// Register a new user
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, userRole } = req.body;

    // Validate required fields
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and confirm password are required",
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password do not match",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password, // In a real app, you'd hash this password
      userRole: userRole || UserRole.TRAVELLER, // Default to traveller if not specified
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        userRole: savedUser.userRole,
        createdAt: savedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required for login",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check password (in a real app, you'd compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Return user data (in a real app, you'd add JWT token here)
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        userRole: user.userRole,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).select("-__v");

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching users",
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-__v");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user",
    });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, userRole } = req.body;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // Update user
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
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating user",
    });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting user",
    });
  }
};

// Get users by role
export const getUsersByRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;

    // Validate role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'owner', 'host', or 'traveller'",
      });
    }

    const users = await User.find({ userRole: role }).select("-__v");

    res.status(200).json({
      success: true,
      message: `Users with role '${role}' retrieved successfully`,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get users by role error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching users by role",
    });
  }
};

// Get user profile (current user)
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // In a real app, this would come from JWT token

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId).select("-__v");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user profile",
    });
  }
};
