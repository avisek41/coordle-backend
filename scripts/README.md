# Plan Update Scripts

This directory contains scripts to update existing plans and assign plans to existing owners in the database.

## Scripts Overview

### 1. `update-plan-names.js`

**Purpose**: Updates existing plan names in the database to remove "Plan" suffix
**Changes**:

- "Organizations Plan" → "Organizations"
- "One Time Event Plan" → "One Time Event"

**Usage**:

```bash
node scripts/update-plan-names.js
```

### 2. `assign-plans-to-owners.js`

**Purpose**: Automatically assigns the "Organizations PRO" plan to all existing owners who don't have plans
**Features**:

- Finds all owners without plans
- Assigns Organizations PRO plan by default
- Shows detailed summary and verification

**Usage**:

```bash
node scripts/assign-plans-to-owners.js
```

### 3. `manual-plan-assignment.js`

**Purpose**: Allows manual assignment of specific plans to specific users
**Features**:

- Shows all available plans and owners
- Allows custom plan assignments
- Requires manual configuration in the script

**Usage**:

```bash
# First edit the script to add your assignments, then run:
node scripts/manual-plan-assignment.js
```

### 4. `quick-plan-update.js`

**Purpose**: Quick and simple plan assignment for existing owners
**Features**:

- Automatically assigns Organizations PRO plan to all owners without plans
- Simple one-command execution
- Shows verification and summary

**Usage**:

```bash
node scripts/quick-plan-update.js
```

## Recommended Workflow

1. **First, update plan names** (if needed):

   ```bash
   node scripts/update-plan-names.js
   ```

2. **Then, assign plans to existing owners**:
   ```bash
   node scripts/quick-plan-update.js
   ```

## Manual Plan Assignment

If you want to assign specific plans to specific users, edit `manual-plan-assignment.js`:

```javascript
const manualAssignments = [
  {
    userEmail: "admin@company.com",
    planName: "Organizations",
    planVariant: "PRO",
  },
  { userEmail: "event@company.com", planName: "One Time Event" },
  {
    userEmail: "user@example.com",
    planName: "Organizations",
    planVariant: "STANDARD",
  },
];
```

## Available Plans

- **Organizations PRO** - $1200/year (recommended for business owners)
- **Organizations STANDARD** - $840/6 months
- **One Time Event** - $250 (101-200 participants)
- **One Time Event** - $175 (0-100 participants)

## Prerequisites

- MongoDB connection string in `.env` file
- Node.js and npm installed
- Database access permissions

## Environment Variables

Make sure your `.env` file contains:

```
MONGODB_URI=mongodb://your-connection-string
```

## Safety Notes

- All scripts include error handling and validation
- Scripts show what they're going to do before doing it
- Verification is performed after updates
- Database connection is properly closed after operations
