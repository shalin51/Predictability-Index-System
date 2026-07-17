# Predictability Index System: Application Flow and Dashboard Guide

## Purpose

The Predictability Index System provides a traceable workflow for evaluating a formulation from controlled source data through manufacturing, lab testing, benchmark scoring, and a downloadable decision report. The dashboard is the operating view of that workflow: it summarizes work that needs attention and links directly to the underlying run, score, or report.

This guide describes the implemented application behavior. It is intended for operators, lab users, formulation users, and system owners.

## End-to-end workflow

```text
Controlled Library
  ├─ materials, suppliers, lots, machines, molds
  └─ metrics, test methods/conditions, benchmarks, scoring rules
                         │
                         ▼
Formulation
  draft → approved → locked version
                         │
                         ▼
Production run + samples
  planned → molded → curing → ready for testing
                         │
                         ▼
Lab testing
  ready for testing → testing → completed
                         │
                         ▼
Run metric summaries → benchmark scoring → generated report
                         │
                         ▼
Dashboard monitoring, risk review, and exports
```

Each business change is written to the backend and is audited. A formulation and a completed/scored production run are intentionally locked against ordinary edits; create a new formulation version rather than changing an approved recipe.

## Before starting

Create and maintain the controlled Library records before creating operational records. The minimum practical setup is:

1. Materials and suppliers.
2. Supplier-material mappings and, when traceability is required, material lots.
3. Machines and molds.
4. Metrics, any applicable test methods and environmental test conditions.
5. A benchmark profile and its scoring rules.
6. A formulation that targets the benchmark.

If a referenced record is not active, it will not be a dependable choice in operational dropdowns. Archive records only when they are no longer appropriate for new work; existing historical data should remain traceable.

## Application layout and navigation

The left sidebar is the primary navigation. It groups pages as follows:

| Area | Page | Primary use |
| --- | --- | --- |
| Operations | Dashboard | Monitor operational counts, risks, scores, queues, and recent reports. |
| Operations | Library | Maintain controlled reference data used throughout the workflow. |
| Workspace | Formulations | Create, approve, version, and archive recipes. |
| Workspace | Production Runs | Record a manufactured batch, samples, parameters, and process status. |
| Workspace | Lab Testing | Enter results for eligible production-run samples and complete testing. |
| Workspace | Reports | Review, generate, regenerate, and export score reports. |
| System | Settings | Save local appearance and startup preferences. |

Use the button in the top-left header to collapse or expand the sidebar. The header title and subtitle change with the active page. The notification bell contains local, in-session notifications; reading or marking them read does not change operational data. The profile menu offers shortcuts to settings and theme selection.

The header search field is currently a visual input only. It does not search records or open a command palette.

### Direct URLs

The application supports browser navigation and bookmarkable paths. Examples:

| Destination | Path |
| --- | --- |
| Dashboard | `/dashboard` |
| Library materials | `/library/materials` |
| Formulation list/new/detail | `/formulations`, `/formulations/new`, `/formulations/{id}` |
| Production run list/new/detail | `/production-runs`, `/production-runs/new`, `/production-runs/{id}` |
| Lab queue/run | `/lab-testing`, `/lab-testing/runs/{id}` |
| Report list/detail | `/reports`, `/reports/{id}` |
| Report for a production run | `/production-runs/{id}/report` |
| Settings | `/settings` |

The deployed static site rewrites unknown browser routes to the application entry point, so opening a supported path directly should load the appropriate view.

## Dashboard: how to use it

Open **Dashboard** to see a one-page operational overview. It loads one consolidated backend response when the page opens. It is a monitoring surface, not a data-entry screen.

### KPI Summary

The KPI cards are current counts across the workflow:

| KPI | Meaning | Typical action |
| --- | --- | --- |
| Active Formulations | Non-archived formulation work available in the workflow. | Review drafts, approvals, and version status in Formulations. |
| Runs Ready for Testing | Runs that have reached `ready_for_testing`. | Send the run to Lab Testing and begin result entry. |
| Runs Awaiting Summary | Completed runs that need a run metric summary. | Generate a summary after confirming results are complete. |
| Runs Awaiting Scoring | Runs with summaries that can proceed to scoring. | Generate benchmark scores. |
| Scored Runs | Runs that have benchmark score reports. | Review risks and generate a report if needed. |
| Green/Yellow/Red Candidates | Best scored candidates grouped by traffic-light classification. | Prioritize green candidates, review yellow warnings, and investigate red risks. |

Counts are informative; they are not links. Use the workflow panels below them to navigate to a particular record.

### Active Workflow

This panel shows counts by workflow stage with proportional bars. Use it to identify a bottleneck: for example, a high `ready_for_testing` count indicates a laboratory queue, while high awaiting-summary or awaiting-scoring counts indicate analysis work not yet completed.

### Lab Testing Queue

Each row represents a run that is ready for testing or is already being tested. It displays run identification, formulation, sample count, completed result count, and missing required metrics. Select **Open** to go straight to that run’s Lab Testing page.

Work the queue by prioritizing records with missing required metrics, then complete testing only after the review tab confirms that required values are present.

### Latest Scored Runs

This widget lists recent benchmark score output. Use its run action to inspect the production run and its scoring tab, or its report action to open the generated report when one is available. It includes the best matching benchmark, Predictability Index, and traffic-light status.

### Benchmark Similarity Overview

This section summarizes four views of scored data:

- **Traffic Light Counts:** number of score results classified as green, yellow, red, or gray.
- **Best Match Counts:** how often each benchmark is the best match.
- **Latest Similarity:** recently calculated benchmark similarity by run.
- **Best Candidates:** the leading runs, their best match, traffic light, and Predictability Index.

Use it to compare candidate quality at a portfolio level. A high similarity to a benchmark does not alone mean a run is release-ready; inspect metric risks and required-result completeness as well.

### Risk Alerts

Risk Alerts contain high-risk or critical metric findings from scoring. Each row identifies the run, metric, risk text, severity, and traffic light. Select **View Score** to open the run, then use the **Scores** tab to see the specific metric, its run mean, benchmark target, acceptable range, and score.

### Recent Reports

Recent Reports lists the latest saved report snapshots. Select **Open** to review the report. A report is a saved snapshot, so it represents the data at generation time; regenerate it after changes that require a fresh decision package.

## Library: establish the controlled data foundation

Open **Library** and choose a section in the page-level left menu. Each section supports search, status filtering, New, Edit, and Archive. The grid’s selected row is also used by **Validate Selected Benchmark** in Scoring Rules.

| Library section | What it controls | Key dependency |
| --- | --- | --- |
| Materials | Material code, name, type, default unit. | Needed in formulation components. |
| Suppliers | Supplier identity and contact information. | Needed in formulation components and supplier-material mapping. |
| Supplier Materials | Valid supplier-to-material combinations. | Required before a lot can be assigned. |
| Material Lots | Lot number and received/expiry dates for a supplier-material. | Optional but traceable formulation-component reference. |
| Machines | Manufacturing equipment. | Required for a production run. |
| Molds | Mold identity, type, and cavity count. | Required for a production run and sample-cavity planning. |
| Metrics | Testable measurement definitions and category. | Drives Lab Testing grids and benchmark rules. |
| Test Methods | Method code, name, linked metric, and cure hours. | Included with applicable numeric results. |
| Test Conditions | Environmental condition definitions. | Used with environmental results. |
| Benchmarks | Benchmark profile, version, brand, and model. | Required target for each formulation. |
| Scoring Rules | Target mean, acceptable range, weight, criticality, and pass requirement per benchmark metric. | Determines score calculation and readiness. |

### Library operating procedure

1. Select the section.
2. Use Search and Status to find the record, or choose **New**.
3. Complete required fields, then select **Save** in the modal.
4. Use **Edit** for corrections; use **Archive** to remove a record from future active selection.
5. For a benchmark, create one scoring rule per metric that should be compared.
6. In **Scoring Rules**, select a rule belonging to the benchmark and choose **Validate Selected Benchmark**. The result message reports whether the benchmark’s rule weights are valid.

Do not enter scoring rules with arbitrary or incomplete targets. A metric without run data or a complete target/range is scored as unavailable, and required unavailable metrics block meaningful scoring readiness.

## Formulations: create and approve a recipe

Open **Formulations** to filter records by text, status, benchmark, material, and created date. The list displays formulation code, version, family, target benchmark, status, component total, and last update.

### Create a formulation

Select **New Formulation**. The wizard has three steps; the tabs can be used to move between them.

1. **Basic Info**
   - Choose an existing experiment or supply a quick experiment name.
   - Choose an existing formulation family or supply a quick family name. A family is required.
   - Enter a formulation code or leave it blank for automatic generation.
   - Choose a target benchmark. It is required.
   - Add notes as needed.
2. **Recipe Components**
   - Add each material component.
   - For every component, select a material and supplier; select a material lot where applicable.
   - Enter its composition as a non-negative weight percentage. The only supported basis is `weight_percent`.
   - The total may be below or above 100% while saving a draft, but individual values may not exceed 100%.
3. **Review**
   - Check the selected benchmark and component total.
   - Select **Save Draft** to preserve a work-in-progress recipe.
   - Select **Approve** only when the total is exactly 100%, within the application’s small numeric tolerance.

### Approval and version control

An approved formulation is locked. Its recipe cannot be edited, and it is eligible for production-run selection. To alter an approved formulation:

1. Open the formulation detail page.
2. Select **Duplicate New Version**.
3. Edit the new draft version.
4. Reapprove it once its total is 100%.

The detail page includes these tabs:

| Tab | Implemented content |
| --- | --- |
| Overview | Family, target benchmark, component total, and last update. |
| Recipe Components | Read-only recipe by default; draft records can be edited after selecting Edit. |
| Production Runs | Placeholder; relationship records are not rendered here yet. |
| Lab Results | Placeholder. |
| Scores | Placeholder. |
| Audit History | Raw audit-history data for this formulation. |

The **Create Production Run** button on the formulation detail page is enabled only for approved records, but it does not currently navigate or create a run. Use **Production Runs → New Production Run**.

## Production Runs: manufacture a traceable batch

Only an approved formulation can be used to create a production run. Open **Production Runs**, use the filters to find work, or select **New Production Run**.

### Create a production run

The wizard has four steps:

1. **Select Formulation**
   - Select an approved formulation. Its version and target benchmark are displayed.
   - Provide a unique run code or leave it blank for automatic generation.
   - Set the production date.
2. **Manufacturing Parameters**
   - Select the required machine and mold.
   - Record injection pressure, melt temperature, cooling time, cycle time, and their units as applicable.
   - Set cure hours before testing; the default is 72 hours.
3. **Generate Samples**
   - Set the sample count and required starting sample code.
   - Assign cavities where applicable. Mold cavity count helps guide the assignments.
   - Sample codes must be unique.
4. **Review**
   - Verify formulation, equipment, parameters, and sample preview.
   - Save the run as **Planned** or **Molded**, according to the available wizard action.

Required run data is formulation, production date, machine, and mold. Numeric process values and cure hours cannot be negative.

### Run lifecycle

The allowed operational sequence is strictly forward:

```text
planned → molded → curing → ready_for_testing → testing → completed → scored
```

The run detail page shows the current status and the next valid action. It does not permit skipped or reverse transitions. Archive is a separate action and removes the run from normal operational use.

Use the run page as follows:

1. Select the next status action as manufacturing progresses.
2. Open **Manufacturing Parameters** to view values; select Edit while the run is unlocked to change them.
3. Once testing has started, an audit reason is required for a manufacturing-parameter change.
4. Open **Samples** to inspect generated sample codes and cavity assignments.
5. When the run reaches `ready_for_testing`, open **Lab Testing** to enter results.

Completed and scored runs are locked against production-run edits. The detail page has placeholders for Lab Results, while the full result-entry and review experience is in Lab Testing. The Audit History tab exposes raw recorded audit data.

## Lab Testing: enter, validate, and complete results

The **Lab Testing** list shows only runs that are ready for testing or already testing. Filter by search text, status, benchmark, production date, machine, mold, and whether required results are missing. Open a queue row to work that run.

### Start and complete testing

1. On the run page, select **Start Testing**. This moves a ready run to `testing`.
2. Enter results in the appropriate category tabs.
3. Open **Review** to see the required-metric completeness position.
4. Select **Complete Testing** only when no required metrics are missing. The application prevents completion otherwise.

Completion moves the run to `completed`, making summary generation available.

### Result-entry tabs

| Tab | Use |
| --- | --- |
| Physical | Enter numeric physical-metric values for each sample. |
| Performance | Enter numeric performance-metric values for each sample. |
| Durability | Enter numeric durability values; crack-propagation observations are also available. |
| Environmental | Enter numeric results with the applicable test condition. |
| Subjective | Record per-sample ratings and free-text feedback. |
| Observations | Record observations by sample and observation type. |
| Review | Identify required metric/sample gaps before completion. |

For numeric and environmental results, the system sends the sample, metric, applicable method/condition, unit, and numeric value. Saving refreshes the run data. Subjective ratings and observations are recorded separately from numeric result grids.

If the page reports missing required metrics, return to the relevant category and complete the required values. Do not use production-run status controls to bypass the laboratory completion gate; summary generation requires laboratory status `completed` and no required-metric gaps.

## Run summaries: turn individual results into metric statistics

For a completed run, open **Production Runs → [run] → Run Summary**.

The page displays the production run, target benchmark, lab-test status, summary status, last generation time, missing required metrics, and a statistics table. The table includes metric/category/condition, sample count (`N`), mean, standard deviation, minimum, maximum, unit, and status.

### Summary procedure

1. Confirm Lab Testing Status is `completed`.
2. Review the missing-metrics table; it must be empty.
3. Select **Generate Summary**.
4. If lab data was corrected afterwards, select **Regenerate Summary**.
5. Continue only when Summary Status is **Ready for Scoring**.

Summary statuses mean:

| Status | Meaning |
| --- | --- |
| Incomplete | Required metrics are missing. |
| Not Generated | Testing is complete but no summary exists yet. |
| Generated | Summary rows exist but the required scoring set is not yet complete. |
| Stale | Results have changed since the summary was generated; regenerate it. |
| Ready for Scoring | Required summaries exist and are current. |

The **Continue to Benchmark Scoring** button is currently a readiness indicator; it does not navigate automatically. Select the run’s **Scores** tab yourself.

## Benchmark scoring: interpret the Predictability Index

Open **Production Runs → [run] → Scores**. Score generation is enabled only when the run is completed or scored, required summaries are present, and no summary is stale.

Select **Generate Score** to calculate reports against each configured benchmark. Select **Regenerate Score** after regenerated summaries or an intentional repeat calculation.

The panel shows the best match, Predictability Index, Franklin X-40 similarity when present, Lifetime similarity when present, production readiness, and traffic light. Select a row in the benchmark table to inspect its metric-level findings and risks.

### Score definitions

For each configured benchmark metric, the application compares the run mean to the benchmark target and acceptable range.

- **Metric score:** `max(0, 100 − normalized distance × 100)`, where normalized distance is the absolute difference from target divided by the acceptable-range width.
- **Overall similarity:** weighted mean of metric scores.
- **Required metric completion:** percent of required metrics with a run mean.
- **Production readiness:** all-green metrics count fully and yellow metrics count at 65%; the result is scaled to 0–100.
- **Predictability Index:** `60% overall similarity + 25% production readiness + 15% required metric completion`.
- **Traffic light:** green at 85 or higher, yellow from 70 through below 85, and red below 70. Gray indicates unavailable/non-finite scoring data.

The exact weights and thresholds are read from the configured scoring algorithm where present; the values above are the current default configuration.

### Risks

The score view surfaces up to six top risks. A required metric outside its acceptable range is critical. A metric score below 60 is high risk. A value within 10% of an acceptable boundary is flagged as a warning. Missing required summary data is blocking.

Scoring does not itself generate recommendations beyond the current reporting placeholder. Use the score table and risk list as the evidence for technical review.

## Reports: produce the decision package

Reports are available from the **Reports** page or a completed/scored production run’s **Report** action.

### Generate a report

1. Open the completed/scored production run.
2. Choose **Report**.
3. If no snapshot exists, select **Generate Report**.
4. Review the saved report sections.
5. Use **Regenerate** after new score output is available.

A report cannot be generated until at least one benchmark score report exists.

### Report contents

Each report snapshot contains:

- Executive summary: production run, formulation, best benchmark match, main risk, X-40/Lifetime similarity where available, Predictability Index, production readiness, and traffic light.
- Benchmark comparison: results for each scored benchmark.
- Predictability Index and production-readiness values.
- Metric breakdown with score, range, and risk information.
- Key risks.
- Lab results, or summaries if raw results are unavailable.
- Manufacturing parameters.
- Formulation recipe.
- Recommendations. The current recommendation text is a placeholder when no generated recommendation exists.

From the report list or report detail, use **PDF** and **CSV** to export a saved report. Exports are generated by the API from the stored snapshot. Regeneration replaces the decision package with a fresh snapshot for the run.

## Settings and local behavior

Settings affect only the current browser’s local storage; they do not alter shared operational data or other users’ dashboards.

| Setting | Behavior |
| --- | --- |
| Theme | Changes the local dashboard appearance. |
| Default landing view | Opens Dashboard or Library when no explicit route is supplied. |
| Auto-refresh widgets | Saved as a preference; the current dashboard page does not implement a recurring polling timer. |
| Desktop-style alerts | Saved as a preference; it does not request browser notification permission. |
| Dense table spacing | Saved as a preference; current table layouts do not consume it. |

Use **Save** to persist any setting. Profile-menu theme changes are applied to the current session as well.

## Operational exceptions and troubleshooting

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| Cannot approve a formulation | Component total is not 100%, or required family/benchmark/components are missing. | Complete the required fields and make the total exactly 100%. |
| Cannot create a production run | The selected formulation is not approved, required equipment/date is missing, or a run/sample code already exists. | Approve the formulation; fill required fields; use unique codes. |
| Cannot advance a run | The requested status skips the sequence. | Use the next displayed status action only. |
| Cannot change parameters after testing begins | No audit reason was supplied. | Provide the audit reason with the update. |
| Cannot complete lab testing | Required metrics are missing. | Use Review and result tabs to fill the missing values. |
| Cannot generate a summary | Lab testing is not completed or required metrics are missing. | Complete testing through the Lab Testing page, then resolve all gaps. |
| Cannot generate a score | Required summaries are missing or stale. | Generate/regenerate the run summary and confirm Ready for Scoring. |
| Cannot generate a report | There are no score reports. | Generate benchmark scoring first. |
| API returns 401 | An API key is configured and the request does not provide the expected `x-api-key`. | Configure the dashboard/client request path consistently with the API security configuration. |

## Technical flow and data boundary

The frontend is a React/Vite single-page application. It calls the API base URL configured with `VITE_API_BASE_URL`; browser code never connects to PostgreSQL directly.

```text
Browser dashboard
  → HTTP API
  → Node/TypeScript domain services
  → repositories
  → PostgreSQL
  → JSON response or report export
```

The API applies versioning, request logging, error handling, and placeholder authentication. Health and version routes are public. When `APP_API_KEY` is configured, non-health routes require `x-api-key`; the backend records `x-user-id` for audit activity, defaulting to `anonymous` when it is absent.

### Important deployment note

The local Express application mounts all domain routers (formulations, production runs, lab testing, summaries, scoring, reports, dashboard, and library). The current Azure Functions dispatcher route registry only lists health, dashboard, library, and version endpoints and only accepts `GET`, `POST`, and `PUT` at the trigger level. As written, deployed Function routes for several dashboard workflows—particularly `PATCH` production-run updates and the additional domain routes—can return 404 or be rejected even though they work through the local Express server. Align the Function dispatcher with the Express router before relying on the full workflow in staging or production.

## Recommended daily operating sequence

1. Maintain the Library when materials, lots, equipment, metrics, benchmarks, or rules change.
2. Create and approve a 100%-complete formulation.
3. Create the production run and samples; move it through manufacturing statuses.
4. When ready, open the Lab Testing queue, start testing, record results, review required metrics, and complete testing.
5. Generate the run summary. Regenerate it after any result correction.
6. Generate and review benchmark scoring, focusing on metric-level risks.
7. Generate the report, export it when needed, and use the Dashboard to monitor queues and candidate status.
