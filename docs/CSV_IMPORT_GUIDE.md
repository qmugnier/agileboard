# CSV Import Guide

## Overview

The Agile Board supports importing user stories from CSV files. Three CSV formats are supported, with automatic format detection based on column headers.

## Supported CSV Formats

### 1. **User Story Format** (Recommended)

This format includes all available fields and supports dependencies between stories.

**Required Columns:**
- `Epic` - Epic name (creates epic if doesn't exist)
- `Story ID` - Unique story identifier (e.g., `US1.1`, `STORY-001`)
- `User Story` - Story title/description (e.g., "As an Architect I want...")
- `Description` - Detailed description
- `Business Value` - Numeric value (required for prioritization)
- `Effort` - Fibonacci points (1, 2, 5, 8, 13, 21, 34, 55, 89)

**Optional Columns:**
- `Dependencies` - Comma-separated story IDs this story depends on (e.g., `US1.1,US1.2`)

**Example:**
```csv
Epic,Story ID,User Story,Description,Business Value,Effort,Dependencies
Assessment,US1.1,As an Architect I want to map all docker-compose services so that I understand dependencies,Full service inventory and dependency graph,13,5,
Assessment,US1.2,As an Architect I want to identify critical service chains so that I understand failure propagation,Identify main control flows,21,8,US1.1
Assessment,US1.3,As a Senior Infra I want to map networking flows so that I identify fragility,Document L2/L3 flows including macvlan,34,13,
Migration,US6.1,As a Senior Infra I want to map internal deployment tool to Kubernetes so that I plan migration,Compare workflows,34,13,
Migration,US6.2,As an Architect I want to define replacement strategy so that we remove Ansible dependency,Define CI/CD,34,13,US6.1
```

**Format Notes:**
- **Epic**: Creates epic if it doesn't exist; can be empty (no epic assignment)
- **Business Value**: Must be a positive integer
- **Effort**: Should be a Fibonacci number for consistency
- **Dependencies**: Leave empty if no dependencies; use comma-separated list for multiple (no spaces recommended)

### 2. **Legacy Format (Old Format)**

Supported for backward compatibility. Similar to User Story format but without epic requirement.

**Required Columns:**
- `Story ID` - Unique story identifier
- `User Story` - Story title
- `Description` - Detailed description
- `Business Value` - Numeric value
- `Effort` - Fibonacci points

**Optional Columns:**
- `Epic` - Epic name (if Epic column provided, treated like User Story format)
- `Dependencies` - Comma-separated story IDs

**Example:**
```csv
Story ID,User Story,Description,Business Value,Effort
STORY-001,Login Feature,Add user login,5,3
STORY-002,Password Reset,Password reset functionality,3,2
```

### 3. **New Format**

Modern format using priority levels. Used internally for new integrations.

**Required Columns:**
- `name` - Story title (lowercase column name required)
- `description` - Story description
- `priority` - Priority level: `low`, `medium`, or `high`

**Optional Columns:**
- `story_points` - Numeric effort points (optional)
- `epic_id` - Epic database ID (optional, for existing epics)

**Example:**
```csv
name,description,priority,story_points
Login Feature,Add user login,high,3
Password Reset,Password reset functionality,medium,2
```

**Format Notes:**
- `priority`: Must be one of: `low` (maps to BV=1), `medium` (BV=2), `high` (BV=3)
- `story_points`: Optional; converted to effort field
- `epic_id`: Must match existing epic ID in database

---

## Import Rules & Validation

### Required Field Validation
- **All formats**: Empty required fields cause row to be skipped
- **User Story & Old format**: Story ID, User Story, Description, Business Value, Effort all required
- **New format**: name and description required; priority required and must be valid

### Data Type Validation
- **Business Value**: Must be a valid integer
- **Effort**: Must be a valid integer (Fibonacci recommended)
- **Dependencies**: Comma-separated story IDs (spaces tolerated, trimmed automatically)
- **Priority**: Must be exactly `low`, `medium`, or `high` (case-insensitive)

### Deduplication
- Stories with duplicate `Story ID` values are skipped (not re-imported)
- Existing stories are not overwritten

### Dependency Linking
- Dependencies are linked after all stories are created (two-pass import)
- Invalid dependency references (story ID doesn't exist) are logged as warnings
- Stories can depend on stories imported in the same batch

### Epic Handling
- **User Story format**: Epics are created if they don't exist
- **Old format**: If Epic column provided, creates epics; otherwise stories have no epic
- **New format**: If epic_id provided, links to existing epic; otherwise no epic

### Error Handling
- Invalid rows are skipped with warning messages
- Import continues despite errors (non-fatal)
- Up to 10 errors displayed in validation feedback
- All errors logged to server console

---

## Upload Process

1. **Select CSV File**
   - Currently supports only `.csv` extension
   - Maximum file size: 5 MB

2. **Frontend Validation**
   - Detects CSV format automatically
   - Validates column headers exist
   - Validates data row requirements
   - Shows first 10 validation errors

3. **Backend Import**
   - Creates epics as needed
   - Three-pass process:
     1. Parse and validate all rows
     2. Create stories without dependencies
     3. Link dependencies between stories
   - Commits transaction after each major operation

4. **Success/Failure**
   - On success: Message shows count of imported stories
   - On failure: Error message displayed with details
   - Dashboard/backlog refreshes automatically

---

## Best Practices

### CSV Structure
- **Consistent format**: Use one format for entire file (don't mix formats)
- **No extra spaces**: In headers and values (auto-trimmed but cleaner if avoided)
- **Quoted fields**: Use quotes for fields containing commas: `"Design, build, test"`
- **Dependencies**: Check that all referenced story IDs exist

### Effort Estimation
```
Fibonacci sequence: 1, 2, 5, 8, 13, 21, 34, 55, 89
1 = Trivial (< 1 hour)
2 = Very small (1-2 hours)
5 = Small (half day)
8 = Medium (1 day)
13 = Large (2-3 days)
21 = Very large (1 week)
34+ = Epic-sized (multiple weeks - consider breaking down)
```

### Business Value
- Low value: 1-10
- Medium value: 11-30
- High value: 31+
- Used for prioritization in backlog ordering

### Dependencies
- Format: `STORY-001,STORY-002,STORY-003`
- Circular dependencies: Not validated; will cause data consistency issues
- Optional: Leave empty for no dependencies

### Workflowing
- All imported stories start in `backlog` status
- Can be moved to sprints after import
- Statuses available: `backlog`, `ready`, `in_progress`, `done`

---

## Troubleshooting

### "CSV format not recognized"
- Verify column headers match exactly (case-sensitive for new format)
- For User Story format: Need Epic, Story ID, User Story, Description, Business Value, Effort
- For Old format: Need Story ID, User Story, Description, Business Value, Effort
- For New format: Need name, description, priority (lowercase for new format)

### "Row X: [field] is empty"
- Fill in all required fields
- Check for extra spaces or hidden characters
- Ensure row formatting matches column count

### "Business Value must be a non-negative number"
- Enter valid integers only (no decimals, symbols, or letters)
- Leave empty for new format if not using direct value entry

### "Story ID already exists, skipping"
- Story was already imported
- Change Story ID if you want to re-import as a different story
- Or clean database from previous import and retry

### "Dependency '[ID]' not found"
- Dependency story ID doesn't exist
- Verify spelling and format of referenced story IDs
- Ensure dependencies are in same import batch or database

### Dependencies not linking
- Check Dependencies column is parsed correctly
- Verify story IDs are exact matches (case-sensitive)
- Review console for "Dependency not found" warnings

---

## Examples

### Example 1: Simple Sprint Backlog (User Story Format)
```csv
Epic,Story ID,User Story,Description,Business Value,Effort,Dependencies
UI,UI-001,As a user I want responsive design,Mobile-first responsive layout,8,5,
UI,UI-002,As a user I want dark mode,Dark theme support,5,3,UI-001
API,API-001,As a dev I want REST endpoints,Core API endpoints,13,8,
API,API-002,As a dev I want authentication,JWT-based auth,13,5,API-001
```

### Example 2: With Complex Dependencies
```csv
Epic,Story ID,User Story,Description,Business Value,Effort,Dependencies
Database,DB-001,Schema design,Initial database schema,13,5,
Database,DB-002,Migration tools,Database migration scripts,13,8,DB-001
Backend,BE-001,ORM setup,Setup ORM framework,8,3,DB-001
Backend,BE-002,CRUD operations,Implement CRUD,13,8,BE-001,DB-002
Frontend,FE-001,API integration,Frontend API client,21,13,BE-002
```

### Example 3: New Format
```csv
name,description,priority,story_points
User Authentication,Implement login/register,high,8
Database Setup,Configure database,high,5
API Development,Build REST API,medium,13
Frontend Design,UI/UX implementation,medium,8
```

---

## Technical Details

### File Storage
- CSV files uploaded to: `/data/` directory (workspace root)
- Temporary parser files cleaned up after import
- Database: `agile.db` (SQLite)

### Database Relationships
- **UserStory.story_id**: Primary key (string)
- **UserStory.epic_id**: Foreign key → Epic.id
- **UserStory.project_id**: Foreign key → Project.id (default project)
- **UserStory.sprint_id**: Initially NULL (backlog)
- **UserStory.status**: Initially "backlog"
- **us_dependencies table**: Many-to-many relationship for story dependencies

### Import Performance
- Typical import: ~1-2 seconds for 100 stories
- Large imports (1000+ stories): May take 10-30 seconds
- Memory usage: ~2-5 MB for 100 stories

### Logging
- All imports logged to `import_utils.py` console output
- Success: "✓ Imported N user stories from CSV"
- Warnings: "⚠️ [Message]" for skipped rows or unlinked dependencies
- Errors: Print to console for debugging

