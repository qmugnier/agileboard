# CSV Import Format Examples & Test Data

This file contains example CSV data for each supported format to help validate the import functionality.

## Format Test Files

### Test File 1: User Story Format (Recommended)
**Filename:** `test_user_story_format.csv`

```csv
Epic,Story ID,User Story,Description,Business Value,Effort,Dependencies
Assessment,US1.1,As an Architect I want to map all docker-compose services so that I understand dependencies,Full service inventory and dependency graph,13,5,
Assessment,US1.2,As an Architect I want to identify critical service chains so that I understand failure propagation,Identify main control flows,21,8,US1.1
Assessment,US1.3,As a Senior Infra I want to map networking flows so that I identify fragility,Document L2/L3 flows including macvlan,34,13,
Assessment,US1.4,As an Infra Engineer I want to replay deployment using internal tool so that I identify weak points,Full deployment replay,21,8,
Assessment,US1.5,As a Senior Infra I want to reverse engineer deployment tool so that I understand orchestration gaps,Analyze image pull + ansible execution,34,13,
Assessment,US1.6,As an Architect I want to analyze etcd usage so that I compare with Kubernetes control plane,Document key usage and node registry,34,13,
Assessment,US1.7,As an Infra Engineer I want to extract Slack incidents so that I build real dataset,Parse Slack threads,21,8,
Assessment,US1.8,As a Senior Infra I want to extract ServiceNow incidents so that I correlate issues,Export SNOW data,21,8,
Assessment,US1.9,As an Architect I want to map incidents to architecture so that I prove systemic issues,Link incidents to root causes,34,13,US1.7
Assessment,US1.10,As a Senior Infra I want to measure recovery time so that I quantify operational load,Measure MTTR,21,8,
Assessment,US1.11,As an Infra Engineer I want to document rollback procedures so that I evaluate safety,Replay rollback,13,5,
Assessment,US1.12,As an Architect I want to identify SPOFs so that I highlight risks,List SPOFs,34,8,
Assessment,US1.13,As a Senior Infra I want to analyze deployment variability so that I detect nondeterminism,Compare deployment runs,21,8,
Assessment,US1.14,As an Infra Engineer I want to capture deployment logs so that I analyze failure patterns,Collect logs,13,5,
Assessment,US1.15,As an Architect I want to consolidate findings so that we establish baseline,Assessment summary,34,8,
FailureModel,US2.1,As an Architect I want to define failure taxonomy so that analysis is consistent,Define categories,21,5,
FailureModel,US2.2,As a Senior Infra I want to simulate real deployment failure so that I observe behavior,Break deployment process,34,13,
FailureModel,US2.3,As a Senior Infra I want to simulate node failure so that I observe system reaction,Shutdown node,34,13,
FailureModel,US2.4,As a Senior Infra I want to simulate network disruption so that I observe system instability,Drop traffic,34,13,
FailureModel,US2.5,As an Architect I want to quantify blast radius so that I measure impact,Measure affected services,21,8,
FailureModel,US2.6,As a Senior Infra I want to simulate etcd inconsistency so that I observe system behavior,Inject inconsistency,34,13,
FailureModel,US2.7,As an Architect I want to correlate failures with architecture so that I prove systemic design flaws,Map failures,34,13,
StatelessApp,US3.1,As a Senior Infra I want to deploy a stateless control app so that I validate runtime compatibility,Deploy core control app,34,13,
StatelessApp,US3.2,As a Senior Infra I want to validate rollout behavior so that deployments are safe,Update app under load,34,13,US3.1
StatelessApp,US3.3,As an Architect I want to validate config injection so that I ensure compatibility,ConfigMaps/env variables,21,8,US3.1
StatelessApp,US3.4,As a Senior Infra I want to simulate runtime failure so that I validate recovery in real conditions,Kill app under load,34,13,US3.1
StatelessApp,US3.5,As an Architect I want to compare behavior with current system so that I quantify improvement,Compare logs/latency,34,8,US3.2
StatefulApp,US4.1,As a Senior Infra I want to deploy Postgres with CNPG so that I validate DB orchestration,Deploy cluster,34,13,
StatefulApp,US4.2,As a Senior Infra I want to migrate schema so that I validate compatibility,Import schema/data,34,13,US4.1
StatefulApp,US4.3,As a Senior Infra I want to simulate DB failover so that I validate consistency,Kill primary,34,13,US4.1
StatefulApp,US4.4,As an Architect I want to validate app reconnection so that I ensure resilience,Test reconnect,34,13,US4.2
StatefulApp,US4.5,As a Senior Infra I want to simulate corruption so that I validate recovery,Inject corruption,21,8,US4.2
StatefulApp,US4.6,As an Architect I want to compare with Patroni so that I justify migration,Compare failover,34,8,US4.3
Network,US5.1,As a Senior Infra I want to reproduce macvlan behavior so that I validate feasibility,Test macvlan equivalent,34,13,
Network,US5.2,As a Senior Infra I want to validate robot communication so that I ensure system works,Test L2 communication over WiFi,34,13,US5.1
Network,US5.3,As an Architect I want to analyze network constraints so that I identify incompatibilities,Document WiFi/L2 limits,34,8,US5.2
Network,US5.4,As a Senior Infra I want to test alternative models so that I find viable solution,Test Multus/hostNetwork,34,13,US5.1
Network,US5.5,As an Architect I want to measure latency/jitter so that I validate determinism,Measure network performance,34,13,US5.2
Network,US5.6,As a Senior Infra I want to simulate robot disconnection so that I test resilience,Disconnect robots,34,13,US5.2
Network,US5.7,As an Architect I want to define final networking model so that system is viable,Select approach,34,8,US5.4
Migration,US6.1,As a Senior Infra I want to map internal deployment tool to Kubernetes so that I plan migration,Compare workflows,34,13,
Migration,US6.2,As an Architect I want to define replacement strategy so that we remove Ansible dependency,Define CI/CD,34,13,US6.1
Migration,US6.3,As a Senior Infra I want to prototype deployment pipeline so that I validate replacement,Build pipeline,34,13,US6.2
Migration,US6.4,As a PM I want to define migration phases so that transition is safe,Define phases,34,13,US6.3
Architecture,US7.1,As an Architect I want to design 2-rack architecture so that we ensure HA,Design topology,34,13,
Architecture,US7.2,As an Architect I want to design 1-rack degraded architecture so that we understand limits,Design degraded mode,21,8,
Architecture,US7.3,As a Senior Infra I want to validate quorum behavior so that system is consistent,Test quorum,34,13,
Architecture,US7.4,As an Architect I want to define failure domains so that scheduling is correct,Define racks,34,8,
Architecture,US7.5,As an Architect I want to define upgrade strategy so that deployments are safe,Define rolling updates,21,8,
TDR,US8.1,As an Architect I want to write current state so that context is clear,Write section,21,8,
TDR,US8.2,As an Architect I want to write failure analysis so that issues are clear,Write section,34,8,
TDR,US8.3,As an Architect I want to write decision rationale so that choice is justified,Write section,34,8,
TDR,US8.4,As an Architect I want to write architecture so that solution is defined,Write section,34,13,
TDR,US8.5,As a PM I want to define migration plan so that execution is possible,Write plan,34,13,
TDR,US8.6,As a PMO I want to validate TDR so that it is defensible,Review,34,8
```

**Usage:**
- Copy content to `us.csv` in the `/data/` directory
- Upload via Configuration > Import section
- Should import 54 stories with epic groupings

---

### Test File 2: Legacy Format (Old Format)
**Filename:** `test_legacy_format.csv`

```csv
Story ID,User Story,Description,Business Value,Effort
STORY-001,User Authentication,Implement login and registration functionality,13,8
STORY-002,Password Reset,Add forgot password flow with email verification,21,5
STORY-003,User Profile,Create user profile page with editable fields,13,5
STORY-004,Dashboard Setup,Build basic dashboard with summary metrics,21,8
STORY-005,Data Export,Export user data to CSV functionality,8,3
```

**Usage:**
- Test backward compatibility with older import format
- Should import 5 stories without epic assignment

---

### Test File 3: New Format
**Filename:** `test_new_format.csv`

```csv
name,description,priority,story_points
User Registration,Implement user signup and email verification,high,5
Login System,User authentication and session management,high,8
Profile Management,User profile creation and editing,medium,5
Dashboard Analytics,Display and analytics dashboard,medium,13
Reporting,Generate and export reports,low,3
Search Functionality,Implement full-text search,medium,8
```

**Usage:**
- Test modern format with priority levels
- Should import 6 stories with automatic effort conversion

---

## Testing Checklist

### Frontend Validation Tests
- [ ] User Story format recognized correctly
- [ ] Old format recognized correctly
- [ ] New format recognized correctly
- [ ] Missing required columns detected
- [ ] Empty required fields flagged
- [ ] Invalid business values rejected
- [ ] Invalid effort values rejected
- [ ] Invalid priorities rejected
- [ ] File size limit enforced (5MB)
- [ ] File type restriction works (.csv only)

### Backend Import Tests
- [ ] User Story format imports successfully
- [ ] Old format imports successfully
- [ ] New format imports successfully
- [ ] Epics created when needed
- [ ] Duplicate story IDs blocked
- [ ] Dependencies linked correctly
- [ ] Stories start in backlog status
- [ ] Error handling graceful (non-fatal errors)
- [ ] Transaction rollback on critical errors
- [ ] Success message shows story count

### Data Integrity Tests
- [ ] Story metadata preserved (title, description)
- [ ] Business values correct
- [ ] Effort values correct
- [ ] Epic assignments correct
- [ ] Dependencies relationships valid
- [ ] Project assignment correct (default project)
- [ ] Status initialized to backlog
- [ ] No sprint assignment on import

### Edge Cases
- [ ] Empty CSV handled gracefully
- [ ] Single row (header only) rejected
- [ ] Unicode characters supported
- [ ] Special characters in descriptions
- [ ] Very long descriptions
- [ ] Circular dependencies detected
- [ ] Cross-format inconsistencies handled
- [ ] Large batch (100+ stories) performance

---

## Validation Error Examples

### Example 1: Missing Required Column
```
CSV Error:
Unrecognized CSV format. Supported formats:
1. User Story: Epic, Story ID, User Story, Description, Business Value, Effort, Dependencies
2. Legacy: Story ID, User Story, Description, Business Value, Effort
3. New: name, description, priority (low/medium/high), story_points (optional), epic_id (optional)
```

### Example 2: Invalid Business Value
```
CSV validation errors:
Row 5: Business Value "abc" must be a non-negative number
Row 10: Business Value "-5" must be a non-negative number
```

### Example 3: Missing Required Field
```
CSV validation errors:
Row 3: User Story is empty
Row 7: Description is empty
Row 12: Effort is empty
```

---

## Quick Start

### Step 1: Prepare CSV
1. Create CSV file with one of the three formats
2. Ensure all required columns present
3. Validate data types and required fields

### Step 2: Upload
1. Go to Configuration page > Import section
2. Select CSV file or drag & drop
3. Review validation results

### Step 3: Confirm Import
1. Click Import button
2. Wait for processing (1-30 seconds depending on file size)
3. See success message with story count

### Step 4: View Backlog
1. Go to Backlog view
2. Should see all imported stories
3. Verify epics, efforts, and dependencies

