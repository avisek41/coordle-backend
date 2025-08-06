# Profile Options API

This API manages the dropdown/list options for profile setup fields in the Coordle application.

## Overview

The Profile Options API provides endpoints to manage the available options for various profile fields such as:
- Racial/Ethnic background
- Pronouns
- Age demographic
- Food allergies
- Dietary restrictions
- Gender identity
- Sexual orientation
- Disability status

## Database Schema

### ProfileOptions Collection

```typescript
interface IProfileOptions {
  category: string;        // The profile field category
  options: string[];       // Array of available options
  isActive: boolean;       // Whether this category is active
  displayOrder: number;    // Order for display purposes
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### GET /api/profile-options
Get all profile options or filter by category.

**Query Parameters:**
- `category` (optional): Filter by specific category

**Response:**
```json
{
  "success": true,
  "message": "Profile options retrieved successfully",
  "data": {
    "racialEthnic": ["Asian", "Black or African American", "Hispanic or Latino", ...],
    "pronouns": ["He/Him", "She/Her", "They/Them", ...],
    "ageDemographic": ["18-24", "25-34", "35-44", ...],
    "foodAllergies": ["Peanuts", "Tree Nuts", "Milk", ...],
    "dietaryRestrictions": ["Vegetarian", "Vegan", "Pescatarian", ...],
    "genderIdentity": ["Man", "Woman", "Non-binary", ...],
    "sexualOrientation": ["Straight", "Gay", "Lesbian", ...],
    "disabilityStatus": ["No disability", "Physical disability", ...]
  }
}
```

### POST /api/profile-options
Create new profile options for a category.

**Request Body:**
```json
{
  "category": "racialEthnic",
  "options": ["Asian", "Black or African American", "Hispanic or Latino"],
  "displayOrder": 1
}
```

### PUT /api/profile-options/:category
Update profile options for a specific category.

**Request Body:**
```json
{
  "options": ["Updated option 1", "Updated option 2"],
  "displayOrder": 2,
  "isActive": true
}
```

### DELETE /api/profile-options/:category
Delete profile options for a specific category.

## Usage Examples

### Frontend Integration

```javascript
// Fetch all profile options
const response = await fetch('/api/profile-options');
const data = await response.json();

// Use in dropdown components
const racialEthnicOptions = data.data.racialEthnic;
const pronounOptions = data.data.pronouns;

// Filter by specific category
const response = await fetch('/api/profile-options?category=pronouns');
const data = await response.json();
const pronounOptions = data.data.pronouns;
```

### Admin Management

```javascript
// Create new category
const response = await fetch('/api/profile-options', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'newCategory',
    options: ['Option 1', 'Option 2'],
    displayOrder: 9
  })
});

// Update existing category
const response = await fetch('/api/profile-options/pronouns', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    options: ['He/Him', 'She/Her', 'They/Them', 'Other']
  })
});
```

## Seeding Data

To populate the database with initial profile options:

```bash
npm run seed-profile-options
```

This will create the following categories with their respective options:
- racialEthnic (10 options)
- pronouns (7 options)
- ageDemographic (7 options)
- foodAllergies (12 options)
- dietaryRestrictions (11 options)
- genderIdentity (8 options)
- sexualOrientation (8 options)
- disabilityStatus (9 options)

## Benefits of This Approach

1. **Centralized Management**: All profile options are stored in one collection
2. **Easy Updates**: Admin can update options without code changes
3. **Consistent Data**: Ensures all users see the same options
4. **Scalable**: Easy to add new categories or modify existing ones
5. **Performance**: Indexed queries for fast retrieval
6. **Flexible**: Support for active/inactive categories and display ordering

## Integration with User Profile

The User model already has fields for these profile options. The frontend can:
1. Fetch available options from this API
2. Display them in dropdown/select components
3. Store the selected values in the User profile fields

This separation allows for easy management of available options while maintaining the user's actual selections in their profile. 