# Chunk 8: Route Overlap Detection & Analysis API Specification

All endpoints are mounted under `/api/routes` and require administrative authorization via:
`Authorization: Bearer <JWT_ADMIN_TOKEN>`

## 1. Endpoints Summary

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/routes/analyze-overlap` | Execute real geographical overlap detection against existing bus routes | Admin Only |
| `GET` | `/api/routes/overlap/:id` | Retrieve detailed analysis report and overlapping segments by ID | Admin Only |
| `GET` | `/api/routes/overlap-history` | List historical analysis runs with metrics and admin audit info | Admin Only |
| `GET` | `/api/routes/proposed` | List all saved proposed bus routes with their coordinate waypoints | Admin Only |
| `POST` | `/api/routes/proposed` | Save a newly drawn proposed route | Admin Only |
| `GET` | `/api/routes/proposed/:id` | Retrieve proposed route details and previous analyses | Admin Only |
| `DELETE` | `/api/routes/proposed/:id` | Safely delete a proposed route and associated coordinates | Admin Only |

## 2. Request & Response Formats

### `POST /api/routes/analyze-overlap`
**Request Body**:
```json
{
  "coordinates": [
    { "latitude": 28.6675, "longitude": 77.2285 },
    { "latitude": 28.6750, "longitude": 77.2200 },
    { "latitude": 28.7050, "longitude": 77.2050 }
  ],
  "proposedRouteName": "Kashmere Gate to Model Town Express",
  "toleranceMeters": 50,
  "saveRecord": true
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "toleranceMeters": 50,
    "proposedTotalDistanceMeters": 5820.4,
    "proposedTotalDistanceKm": 5.82,
    "overlappingDistanceMeters": 2410.8,
    "overlappingDistanceKm": 2.41,
    "overlapPercentage": 41.42,
    "affectedRoutes": [
      {
        "existingRouteId": "uuid-1",
        "existingRouteNumber": "104",
        "existingRouteName": "Kashmere Gate ISBT to BBM Depot",
        "overlapDistanceMeters": 2410.8,
        "overlapDistanceKm": 2.41,
        "overlapPercentage": 41.42,
        "segments": [...]
      }
    ],
    "overlappingPolylines": [[[28.6675, 77.2285], ...]],
    "nonOverlappingPolylines": [[[28.6900, 77.2100], ...]],
    "analysisId": "uuid-analysis",
    "savedAt": "2026-11-13T13:30:00.000Z"
  }
}
```
