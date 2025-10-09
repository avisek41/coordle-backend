# Knowledge Base API Documentation

This API provides comprehensive endpoints for managing knowledge base entries in MongoDB. The API supports CRUD operations, search functionality, filtering, pagination, and bulk operations.

## Base URL
```
/api/knowledge-base
```

## Data Model

### KnowledgeBase Entry Structure
```typescript
interface IKnowledgeBase {
  _id: string;                    // MongoDB ObjectId
  knowledgeBaseName: string;      // Name of the knowledge base
  title: string;                  // Entry title
  subtitle: string;               // Entry subtitle
  language: string;               // Language code (default: "en")
  url: string;                    // Valid HTTP/HTTPS URL
  bodyHtml: string;              // HTML content
  category: string;               // Entry category
  subcategory: string;            // Entry subcategory (optional)
  keywords: string;               // Search keywords (optional)
  lastModified: string;           // Last modified timestamp
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";  // Entry status
  archived: boolean;              // Archive flag
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

## Endpoints

### 1. Create Knowledge Base Entry
**POST** `/api/knowledge-base`

Creates a new knowledge base entry.

#### Request Body
```json
{
  "knowledgeBaseName": "Halos demo",
  "title": "What is halos",
  "subtitle": "Advanced body-worn cameras and seamless evidence management to protect what matters most.",
  "language": "en",
  "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/what-is-halos",
  "bodyHtml": "<p>For public safety and campus security leaders...</p>",
  "category": "Support",
  "subcategory": "",
  "keywords": "",
  "lastModified": "1759389530375",
  "status": "PUBLISHED",
  "archived": false
}
```

#### Response
```json
{
  "success": true,
  "message": "Knowledge base entry created successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "knowledgeBaseName": "Halos demo",
    "title": "What is halos",
    "subtitle": "Advanced body-worn cameras and seamless evidence management to protect what matters most.",
    "language": "en",
    "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/what-is-halos",
    "bodyHtml": "<p>For public safety and campus security leaders...</p>",
    "category": "Support",
    "subcategory": "",
    "keywords": "",
    "lastModified": "1759389530375",
    "status": "PUBLISHED",
    "archived": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get All Knowledge Base Entries
**GET** `/api/knowledge-base`

Retrieves all knowledge base entries with optional filtering and pagination.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of entries per page (default: 10)
- `category` (optional): Filter by category
- `subcategory` (optional): Filter by subcategory
- `language` (optional): Filter by language (default: "en")
- `status` (optional): Filter by status (default: "PUBLISHED")
- `archived` (optional): Filter by archived status (default: "false")
- `search` (optional): Text search across title, subtitle, and bodyHtml
- `sortBy` (optional): Sort field (default: "createdAt")
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: "desc")

#### Example Request
```
GET /api/knowledge-base?page=1&limit=5&category=Support&status=PUBLISHED&search=halos
```

#### Response
```json
{
  "success": true,
  "message": "Knowledge base entries retrieved successfully",
  "data": {
    "entries": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "knowledgeBaseName": "Halos demo",
        "title": "What is halos",
        "subtitle": "Advanced body-worn cameras...",
        "language": "en",
        "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/what-is-halos",
        "bodyHtml": "<p>For public safety...</p>",
        "category": "Support",
        "subcategory": "",
        "keywords": "",
        "lastModified": "1759389530375",
        "status": "PUBLISHED",
        "archived": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalEntries": 25,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 5
    }
  }
}
```

### 3. Get Knowledge Base Entry by ID
**GET** `/api/knowledge-base/:id`

Retrieves a specific knowledge base entry by its ID.

#### Path Parameters
- `id`: MongoDB ObjectId of the entry

#### Example Request
```
GET /api/knowledge-base/64f1a2b3c4d5e6f7g8h9i0j1
```

#### Response
```json
{
  "success": true,
  "message": "Knowledge base entry retrieved successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "knowledgeBaseName": "Halos demo",
    "title": "What is halos",
    "subtitle": "Advanced body-worn cameras...",
    "language": "en",
    "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/what-is-halos",
    "bodyHtml": "<p>For public safety...</p>",
    "category": "Support",
    "subcategory": "",
    "keywords": "",
    "lastModified": "1759389530375",
    "status": "PUBLISHED",
    "archived": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Update Knowledge Base Entry
**PUT** `/api/knowledge-base/:id`

Updates an existing knowledge base entry.

#### Path Parameters
- `id`: MongoDB ObjectId of the entry

#### Request Body
```json
{
  "title": "Updated title",
  "subtitle": "Updated subtitle",
  "status": "DRAFT",
  "keywords": "updated, keywords"
}
```

#### Response
```json
{
  "success": true,
  "message": "Knowledge base entry updated successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "knowledgeBaseName": "Halos demo",
    "title": "Updated title",
    "subtitle": "Updated subtitle",
    "language": "en",
    "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/what-is-halos",
    "bodyHtml": "<p>For public safety...</p>",
    "category": "Support",
    "subcategory": "",
    "keywords": "updated, keywords",
    "lastModified": "1759389530375",
    "status": "DRAFT",
    "archived": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### 5. Delete Knowledge Base Entry
**DELETE** `/api/knowledge-base/:id`

Deletes a knowledge base entry.

#### Path Parameters
- `id`: MongoDB ObjectId of the entry

#### Response
```json
{
  "success": true,
  "message": "Knowledge base entry deleted successfully"
}
```

### 6. Search Knowledge Base Entries
**GET** `/api/knowledge-base/search`

Performs full-text search across knowledge base entries.

#### Query Parameters
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of entries per page (default: 10)
- `category` (optional): Filter by category
- `subcategory` (optional): Filter by subcategory
- `language` (optional): Filter by language (default: "en")
- `status` (optional): Filter by status (default: "PUBLISHED")
- `archived` (optional): Filter by archived status (default: "false")

#### Example Request
```
GET /api/knowledge-base/search?q=halos&category=Support&page=1&limit=5
```

#### Response
```json
{
  "success": true,
  "message": "Knowledge base search completed successfully",
  "data": {
    "query": "halos",
    "entries": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "knowledgeBaseName": "Halos demo",
        "title": "What is halos",
        "subtitle": "Advanced body-worn cameras...",
        "category": "Support",
        "status": "PUBLISHED",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalEntries": 8,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 5
    }
  }
}
```

### 7. Get Entries by Category
**GET** `/api/knowledge-base/category/:category`

Retrieves all entries for a specific category.

#### Path Parameters
- `category`: Category name

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of entries per page (default: 10)
- `subcategory` (optional): Filter by subcategory
- `language` (optional): Filter by language (default: "en")
- `status` (optional): Filter by status (default: "PUBLISHED")
- `archived` (optional): Filter by archived status (default: "false")

#### Example Request
```
GET /api/knowledge-base/category/Support?page=1&limit=10
```

### 8. Get All Categories
**GET** `/api/knowledge-base/categories`

Retrieves all unique categories.

#### Query Parameters
- `language` (optional): Filter by language (default: "en")
- `status` (optional): Filter by status (default: "PUBLISHED")
- `archived` (optional): Filter by archived status (default: "false")

#### Response
```json
{
  "success": true,
  "message": "Knowledge base categories retrieved successfully",
  "data": {
    "categories": ["Support", "Documentation", "Tutorials", "FAQ"]
  }
}
```

### 9. Get Subcategories for Category
**GET** `/api/knowledge-base/categories/:category/subcategories`

Retrieves all unique subcategories for a specific category.

#### Path Parameters
- `category`: Category name

#### Query Parameters
- `language` (optional): Filter by language (default: "en")
- `status` (optional): Filter by status (default: "PUBLISHED")
- `archived` (optional): Filter by archived status (default: "false")

#### Example Request
```
GET /api/knowledge-base/categories/Support/subcategories
```

#### Response
```json
{
  "success": true,
  "message": "Knowledge base subcategories for category 'Support' retrieved successfully",
  "data": {
    "category": "Support",
    "subcategories": ["Technical", "Billing", "General", "Account"]
  }
}
```

### 10. Bulk Create Entries
**POST** `/api/knowledge-base/bulk`

Creates multiple knowledge base entries in a single request.

#### Request Body
```json
{
  "entries": [
    {
      "knowledgeBaseName": "Halos demo",
      "title": "What is halos",
      "subtitle": "Advanced body-worn cameras...",
      "language": "en",
      "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/what-is-halos",
      "bodyHtml": "<p>For public safety...</p>",
      "category": "Support",
      "subcategory": "",
      "keywords": "",
      "lastModified": "1759389530375",
      "status": "PUBLISHED",
      "archived": false
    },
    {
      "knowledgeBaseName": "Halos demo",
      "title": "Vault: A Quick Demo",
      "subtitle": "A short 5 minute introduction to Vault",
      "language": "en",
      "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/halos-body-cam",
      "bodyHtml": "<p>Welcome to HALO Vault!...</p>",
      "category": "Support",
      "subcategory": "",
      "keywords": "",
      "lastModified": "1759907662988",
      "status": "PUBLISHED",
      "archived": false
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "message": "Bulk creation completed",
  "data": {
    "results": [
      {
        "index": 0,
        "success": true,
        "entryId": "64f1a2b3c4d5e6f7g8h9i0j1",
        "message": "Entry created successfully"
      },
      {
        "index": 1,
        "success": true,
        "entryId": "64f1a2b3c4d5e6f7g8h9i0j2",
        "message": "Entry created successfully"
      }
    ],
    "errors": [],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0
    },
    "entries": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "knowledgeBaseName": "Halos demo",
        "title": "What is halos",
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "knowledgeBaseName": "Halos demo",
        "title": "Vault: A Quick Demo",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Features

### Text Search
The API supports full-text search across title, subtitle, and bodyHtml fields using MongoDB's text search capabilities.

### Pagination
All list endpoints support pagination with configurable page size and page numbers.

### Filtering
Entries can be filtered by:
- Category
- Subcategory
- Language
- Status (PUBLISHED, DRAFT, ARCHIVED)
- Archived status

### Sorting
Entries can be sorted by any field in ascending or descending order.

### Bulk Operations
The API supports bulk creation of entries for efficient data import.

### Data Validation
All endpoints include comprehensive validation for:
- Required fields
- URL format validation
- Status enum validation
- Data type validation

## Usage Examples

### Example 1: Create a new entry
```bash
curl -X POST http://localhost:3000/api/knowledge-base \
  -H "Content-Type: application/json" \
  -d '{
    "knowledgeBaseName": "Halos demo",
    "title": "What is halos",
    "subtitle": "Advanced body-worn cameras and seamless evidence management to protect what matters most.",
    "language": "en",
    "url": "https://243961056.hs-sites-na2.com/en/halosdemo-knowledge-base/what-is-halos",
    "bodyHtml": "<p>For public safety and campus security leaders...</p>",
    "category": "Support",
    "subcategory": "",
    "keywords": "",
    "lastModified": "1759389530375",
    "status": "PUBLISHED",
    "archived": false
  }'
```

### Example 2: Search entries
```bash
curl "http://localhost:3000/api/knowledge-base/search?q=halos&category=Support&page=1&limit=5"
```

### Example 3: Get entries by category
```bash
curl "http://localhost:3000/api/knowledge-base/category/Support?page=1&limit=10"
```

### Example 4: Get all categories
```bash
curl "http://localhost:3000/api/knowledge-base/categories"
```

This API provides a complete solution for managing knowledge base entries with MongoDB, supporting all common operations and advanced features like search, filtering, and pagination.
