# Prompt i used:

# MASTER PROMPT: Local-First Financial Tracker for Indonesian Manufacturing SMEs

## 1. Your Role

Act as a senior software architect, financial accounting systems engineer, product designer, and vanilla JavaScript developer.

Your responsibility is to help build a reliable, intuitive, and maintainable financial tracking website for Indonesian micro, small, and medium-sized manufacturing businesses (UMKM).

You must approach this project as a real financial software product, not merely a dashboard prototype. Financial calculations, accounting integrity, data preservation, usability, and maintainable architecture are more important than adding features quickly.

You must work incrementally. Do not attempt to build the entire application in one response or one implementation phase.

**Your first task is planning and validation, not coding.** Follow the implementation workflow in Section 13 and wait for explicit approval before proceeding beyond each phase.

---

## 2. Product Overview

### Product vision

Build a simple accounting and financial tracking application that enables small manufacturing business owners to understand their financial position without requiring them to understand accounting procedures in depth.

The application should make bookkeeping straightforward while automatically handling the underlying accounting logic.

The product should help users answer three fundamental questions:

1. What does my business own and owe?
2. Is my business profitable?
3. Where does my business's cash come from and where does it go?

The application must produce the following primary financial reports:

- Balance Sheet (Statement of Financial Position).
- Income Statement (Profit and Loss Statement).
- Cash Flow Statement.

The application must also support manufacturing-related inventory and production costs so that the financial reports reflect the economics of producing and selling goods.

### Target user

The primary user is the owner or operator of a small manufacturing business in Indonesia.

Assume the user may not possess formal accounting knowledge. The interface must therefore use straightforward business language and simple transaction forms.

The accounting engine, rather than the user, should handle routine journal entries whenever the relevant business event can be identified unambiguously.

### Product principles

Prioritise the following, in order:

1. Accounting correctness and financial data integrity.
2. Ease of use for non-accountants.
3. Reliable local data persistence and recovery.
4. Clear, actionable financial reporting.
5. Maintainable code and modular architecture.
6. Visual polish and responsive design.
7. Extensibility without premature complexity.

Do not sacrifice accounting correctness or data safety merely to simplify the interface.

---

## 3. Mandatory Technology Stack and Constraints

Use the following stack without silently substituting other technologies.

### Frontend

- HTML5.
- CSS3.
- Vanilla JavaScript.
- Tailwind CSS.
- Native browser APIs where appropriate.

### Prohibited technologies

Do not introduce:

- React.
- Vue.
- Angular.
- Svelte.
- Next.js.
- Nuxt.
- Backend application servers.
- Cloud databases.
- Serverless functions.
- Authentication services.
- Build tools or bundlers.
- Mandatory Node.js tooling.
- Unnecessary third-party dependencies.

Do not turn this project into a framework-based application.

### Tailwind CSS

The original requirement is to use Tailwind CSS without build tooling.

Use the official Tailwind Play CDN/browser approach as the provisional implementation choice. Pin or document the selected CDN version and follow its official integration instructions.

Do not silently introduce a Tailwind build pipeline or change the no-build requirement.

However, explicitly document these trade-offs:

- Play CDN is intended for development rather than production.
- The application depends on the external CDN to generate Tailwind styles at runtime.
- Offline functionality for stored financial data does not guarantee that Tailwind styling will work offline.
- Production performance and long-term availability may be inferior to a precompiled CSS build.

If a production limitation becomes material, explain it and present the alternative without implementing a different toolchain without approval.

### Deployment

- Deploy the static frontend to Vercel.
- No backend is required.
- No server-side data processing is permitted.
- No remote account synchronisation is required.
- Do not transmit financial records to external services.

The application must remain a static website that can be hosted without application-server infrastructure.

---

## 4. Application Architecture

Design a modular, frontend-only application.

Keep HTML, CSS, and JavaScript separated. Within JavaScript, separate domain logic from UI rendering and persistence.

Use ES modules where appropriate, while ensuring that the application can be deployed as static files without a bundler.

Propose a repository structure during the planning phase before creating the implementation.

A possible conceptual structure is:

- `index.html`: application entry point.
- `assets/`: static assets and icons.
- `css/`: custom styles and design tokens.
- `js/app/`: initialisation, navigation, and application state.
- `js/domain/`: accounting rules, transaction validation, inventory costing, production costing, and tax calculations.
- `js/services/`: transaction processing, report generation, export, and import services.
- `js/storage/`: localStorage access, schema versioning, migrations, and persistence.
- `js/ui/`: reusable interface components and page rendering.
- `js/utils/`: date, currency, validation, and formatting utilities.
- `docs/`: architecture notes, accounting assumptions, tax references, and manual testing procedures.

This structure is illustrative. During Phase 0, recommend a concrete structure that remains proportionate to the project.

Avoid both extremes: one enormous JavaScript file and unnecessary enterprise-level abstraction.

### Separation of responsibilities

At minimum, distinguish the following responsibilities:

**Presentation layer:** forms, tables, navigation, dialogs, report views, and user feedback.

**Domain layer:** accounting calculations, double-entry validation, production costing, inventory valuation, and applicable tax calculations.

**Persistence layer:** serialisation, deserialisation, localStorage operations, versioned schemas, and data recovery.

**Application services:** coordinate user actions and domain operations without embedding accounting calculations inside UI event handlers.

Financial rules must not be duplicated across screens.

---

## 5. Accounting Engine and Financial Domain

This is the application's most important subsystem.

### 5.1 Accounting method

Use accrual accounting as the provisional baseline, combined with double-entry bookkeeping.

Users must interact with simple business transaction forms. They should not normally be required to choose debit and credit accounts manually.

The application must translate business events into balanced journal entries through a central accounting engine.

Examples of business events include:

- Purchasing materials.
- Paying suppliers.
- Selling finished goods.
- Receiving customer payments.
- Recording expenses.
- Borrowing money.
- Repaying loans.
- Receiving capital contributions.
- Making owner withdrawals.
- Acquiring fixed assets.
- Producing finished goods.
- Recording applicable taxes.

Not every transaction should create revenue or expense immediately. Account classification and recognition must follow the documented accounting rules.

### 5.2 Double-entry integrity

Every posted journal entry must satisfy:

`Total Debits = Total Credits`

Enforce this invariant inside the domain layer, not just in the UI.

Additional requirements:

- Posted journal entries cannot be silently edited or deleted.
- Corrections must preserve the audit trail through controlled reversals or correcting entries.
- Draft transactions may be edited before posting.
- Invalid or incomplete transactions must not affect account balances.
- A transaction must not be partially posted.
- Any failed operation must leave the financial data consistent.
- Derived balances and reports must be reproducible from the accounting records.

Do not allow a UI operation to update one account balance while leaving related journal entries inconsistent.

### 5.3 Chart of accounts

Provide a sensible default chart of accounts for a small manufacturing business.

Include relevant categories such as:

- Assets.
- Liabilities.
- Equity.
- Revenue.
- Operating expenses.
- Production costs.
- Inventory.
- Receivables and payables.
- Tax accounts.
- Cash and bank accounts.

Manufacturing-related accounts should distinguish raw materials, work in progress, and finished goods where required by the accounting model.

Users should be able to add appropriate custom accounts and edit permitted account details.

Protect required system accounts and structural relationships. Never allow customisation to silently break the accounting engine or report mappings.

Do not hard-code report totals based on account names. Use explicit account types, mappings, and documented classification rules.

### 5.4 Opening balances

Support the entry of opening balances when a business first configures the application.

Allow the user to establish relevant opening positions for cash, bank accounts, receivables, inventory, fixed assets, liabilities, and equity.

Opening balances must form a balanced accounting entry before the business can begin posting normal transactions.

Opening inventory must include enough information to support quantity tracking and the selected costing method.

Explain any balancing discrepancy instead of silently creating an unexplained adjustment.

### 5.5 Core transaction types

Design the initial transaction model to support the following categories:

- Sales and other business income.
- Cash and bank receipts.
- Purchases.
- Operating expenses.
- Supplier payments.
- Customer receipts.
- Transfers between cash and bank accounts.
- Accounts receivable.
- Accounts payable.
- Capital contributions.
- Owner withdrawals.
- Loans and repayments.
- Fixed asset acquisition and disposals.
- Inventory adjustments.
- Production activity.
- Taxes applicable to the business profile.

Support transaction dates, descriptions, reference numbers, account or category mappings, and relevant counterparties.

Support partial receipts and payments where necessary.

Prevent transfers between the business's own cash accounts from being incorrectly classified as new income or expenses.

### 5.6 Reporting periods

Allow the user to select reporting periods and relevant as-of dates.

Reports must use consistent date boundaries and time handling.

Support historical views without rewriting previously recorded transactions when the selected reporting period changes.

Provide sensible empty states for a newly configured business with no transactions.

---

## 6. Manufacturing, Inventory, and Production Costing

The application targets small manufacturers, so manufacturing accounting must be a first-class domain rather than an ordinary expense category.

### 6.1 Inventory categories

Support at least:

- Raw materials.
- Work in progress (WIP).
- Finished goods.

Separate inventory quantities from their financial valuations.

### 6.2 Bill of materials

Provide a basic Bill of Materials (BOM) for manufactured products.

A BOM must describe the materials and quantities expected to produce a defined quantity of finished goods.

Validate material availability before recording production consumption.

Allow the user to manage products, raw materials, and relevant units of measure.

### 6.3 Production batches

Support basic production batches with:

- Product being manufactured.
- Planned or actual output quantity.
- Materials consumed.
- Direct labour costs.
- Allocated manufacturing overhead.
- Production date.
- Actual finished quantity.
- Relevant production references and notes.

Provide a straightforward workflow for starting, recording, and completing production.

Keep the model extensible for future support of partial completion or more detailed WIP tracking.

Do not implement a complex manufacturing planning system unless explicitly approved.

### 6.4 Manufacturing cost calculation

The provisional cost model must account for:

- Direct materials.
- Direct labour.
- Allocated manufacturing overhead.

Production costs must be accumulated consistently and transferred to finished goods when production is completed.

Support the appropriate treatment of inventory consumption, production completion, and cost of goods sold.

Use the accounting engine to generate the related journal entries.

Do not expense ordinary manufacturing costs twice or count a transfer from raw materials to WIP as a new operating expense.

### 6.5 Inventory valuation

The preferred initial recommendation is moving weighted-average costing for raw materials and finished goods.

However, this method has not yet been explicitly approved. Document it as a provisional assumption during Phase 0 and explain its implications before implementing the inventory costing engine.

Once a method is selected:

- Apply it consistently.
- Preserve historical transaction costs.
- Define how returns, adjustments, negative inventory, and corrections behave.
- Ensure cost calculations are deterministic and reproducible.
- Prevent users from inadvertently mixing costing methods in the same inventory history.

Negative stock should be blocked by default unless an explicitly documented and approved business rule permits it.

### 6.6 Production costing limitations

The initial manufacturing scope is basic.

Do not assume that advanced features such as machine scheduling, multi-level production routing, complex scrap allocation, standard-versus-actual variance accounting, or advanced capacity planning are included.

Document these as potential future extensions rather than implementing them prematurely.

---

## 7. Financial Reports

The application must generate three primary reports with consistent accounting logic.

### 7.1 Balance Sheet

Show the business's financial position as of a selected date.

Include:

- Assets.
- Liabilities.
- Equity.

The fundamental accounting equation must hold:

`Assets = Liabilities + Equity`

Where appropriate, provide subtotals and a drill-down to the accounts or transactions contributing to the reported values.

### 7.2 Income Statement

Show revenue, relevant cost of goods sold, gross profit where applicable, operating expenses, other income or expenses, and net profit or loss for a selected period.

Manufacturing costs must be classified correctly.

The statement must distinguish inventory costs from costs recognised in the period.

### 7.3 Cash Flow Statement

Use the direct method as the initial reporting approach.

Classify cash movements into:

- Operating activities.
- Investing activities.
- Financing activities.

Define and document transaction classification rules.

Internal transfers between cash and bank accounts must not be double-counted as business cash inflows or outflows.

Cash movements and accrual-based revenue or expenses must not be treated as interchangeable concepts.

### 7.4 Accounting-standard alignment

Use an appropriate Indonesian accounting framework for the type of entity being configured.

During Phase 0, evaluate whether an SAK EMKM-oriented baseline is appropriate for the intended users or whether a different framework is needed.

The three requested primary reports must be supported as a product requirement, even when a particular reporting framework has a different minimum set of statements.

Additional disclosures, statement requirements, and supplementary reports should be identified where relevant.

Do not claim full compliance with a standard merely because the application produces three reports.

Document the selected baseline, its scope, and the areas requiring professional accounting review.

### 7.5 Report integrity

Reports must be derived from the accounting records through a consistent reporting engine.

Do not implement report totals as unrelated calculations embedded directly inside individual HTML pages.

Provide:

- Period and date filters.
- Clear totals and subtotals.
- Empty states.
- Sensible zero-value handling.
- Clear indication of the selected date or period.
- Drill-down where practical.
- Consistent rounding and currency formatting.

---

## 8. Tax Calculation Engine

Tax calculation is a required product capability, not an optional placeholder.

However, Indonesian tax rules depend on legal form, registration status, taxable turnover, tax regime, transaction type, and the regulations applicable to the relevant period.

Implement the tax module incrementally and use official sources when defining its behaviour.

### 8.1 Tax profile

Allow the user to configure the business's relevant tax profile, including:

- Legal form.
- Taxpayer category.
- Relevant tax registration status.
- Annual turnover and applicable turnover thresholds.
- Applicable tax regime.
- Taxable entrepreneur status for VAT/PPN, where relevant.
- Effective dates of relevant elections or registrations.
- Other eligibility details required by the selected tax calculation.

Do not infer eligibility from the label "UMKM" alone.

### 8.2 Tax calculation scope

During Phase 0, define a practical initial tax scope based on current official Indonesian regulations.

Evaluate at minimum:

- PPh Final for UMKM, where the specific taxpayer is eligible.
- General income-tax calculations applicable to the configured business, where included in the approved scope.
- VAT/PPN calculations for relevant transactions where applicable.
- Relevant withholding or collection taxes as a documented extension or separate approved module.

The application must not automatically apply a tax rate to every business merely because the business is small.

It must also not assume that all manufacturing businesses qualify for the same tax regime.

### 8.3 Current legal sources

For tax rules, use official sources such as:

- Directorate General of Taxes: https://www.pajak.go.id/
- Ministry of Finance legal documentation: https://jdih.kemenkeu.go.id/
- Official regulations and implementing guidance published by relevant Indonesian authorities.

As of the prompt date, 24 October 2026, PP 20/2026 is a relevant change to the PPh Final UMKM framework.

Verify the law and its implementing guidance as they stand when the tax module is designed. Do not rely on an outdated tutorial, a remembered tax rate, or a non-official blog when a current rule can be checked.

If you cannot verify a rule against a reliable official source, state the limitation, mark the rule as unverified, and do not silently treat it as legally established.

### 8.4 Versioned tax rules

Keep tax rules separate from presentation code.

Where practical, maintain a tax-rule registry containing:

- Rule identifier.
- Tax type.
- Applicable taxpayer conditions.
- Calculation method.
- Effective date.
- Expiry or replacement date, when applicable.
- Official source reference.
- Relevant explanatory notes.
- Rounding rules.
- Validation examples.

Historical calculations must use the applicable rule for the relevant period, not automatically substitute the newest rate into every historical record.

### 8.5 Tax transparency

For every tax calculation, show:

- Tax type.
- Tax base.
- Relevant rates or thresholds.
- Applicable eligibility conditions.
- Calculation steps or a clear explanation.
- Applicable rule date and source reference.
- Any assumptions or missing information.

Clearly distinguish estimated calculations and bookkeeping support from an official tax return.

The initial application does not need direct integration with official tax-filing systems.

Do not claim that tax calculations constitute legally certified tax advice or guarantee compliance.

---

## 9. Local Persistence, Security, and Data Recovery

### 9.1 Storage

Use browser `localStorage` as the primary data store.

No backend or cloud database is allowed.

Support one user managing one business in one browser environment.

The application does not need multi-user access or automatic cross-device synchronisation.

Use a well-defined storage abstraction so that storage operations are not scattered throughout the application.

### 9.2 Data integrity

Implement:

- Stable unique identifiers.
- A versioned data schema.
- Safe serialisation and parsing.
- Validation before accepting imported data.
- Migration procedures for future schema changes.
- Consistent references between transactions, journal entries, accounts, inventory records, and production batches.
- Clear handling of storage quota failures.
- User-visible errors when a persistence operation fails.

Never report a transaction as saved until the persistence operation succeeds.

If localStorage cannot accommodate the dataset, explain the limitation rather than silently losing records or switching to an unapproved storage service.

### 9.3 Local access protection

The earlier requirements indicated interest in local access protection, but the exact security mechanism was not conclusively selected.

During Phase 0, present a recommended default: a local PIN gate as a convenience feature, with its limitations clearly explained.

A local PIN is not a substitute for encryption and does not prevent someone with sufficient local browser access from inspecting or modifying stored data.

Do not describe a PIN-only implementation as strong financial-data security.

If implementing a PIN:

- Never store the plaintext PIN.
- Use available cryptographic browser APIs for PIN verification where appropriate.
- Protect against trivial bypasses within the limits of a client-only application.
- Provide a carefully documented recovery story.
- Do not promise that localStorage is protected against a determined local attacker.

Do not add remote authentication or silently introduce an account system.

If stronger confidentiality is later required, present an explicit design for encryption and recovery before implementing it.

### 9.4 Backup and restore

Provide a complete JSON backup of the user's application data.

The backup should include:

- A schema version.
- An application version or equivalent format identifier.
- Export timestamp.
- Business configuration.
- Chart of accounts.
- Opening balances.
- Transactions and journal entries.
- Inventory records.
- Production records.
- Relevant tax configuration.
- Other records needed to restore the application consistently.

Provide a restore workflow that validates the backup before changing existing data.

Restoring a backup must be an intentional action, with a preview or summary and an explicit confirmation before replacing current data.

Where practical, create a recovery backup before a destructive restore.

Reject malformed or incompatible backups with useful error messages.

### 9.5 CSV import and export

Support CSV transaction export and import.

The import process must:

1. Validate the file format.
2. Map incoming columns to known fields.
3. Validate dates, amounts, accounts, and required fields.
4. Detect likely duplicate transactions.
5. Show a preview before committing.
6. Report rejected rows and reasons.
7. Avoid partial imports that leave accounting records inconsistent.

The application must not trust imported file contents.

### 9.6 Explicit data warning

Clearly inform users that the financial data is stored locally in the current browser environment.

The information is not automatically backed up to Vercel and does not automatically follow the user to a different browser or device.

Make the backup and recovery workflow discoverable rather than hiding it in an obscure settings menu.

---

## 10. User Interface and Design System

### 10.1 Language and regional formatting

Use Bahasa Indonesia for the user-facing interface.

Use Indonesian Rupiah (IDR) as the default and initial supported currency.

Format monetary values using Indonesian conventions, including appropriate currency formatting such as `Rp1.250.000`.

Use `id-ID` number formatting and an appropriate Indonesian date presentation.

Use `Asia/Jakarta` as the default business timezone assumption where relevant.

Keep internal storage formats separate from presentation formats.

Do not interpret date-only records in a way that shifts their calendar date when opened in another timezone.

### 10.2 Colour system

Follow the requested 60:30:10 primary, secondary, and tertiary colour ratio.

- Primary: green.
- Secondary: a complementary neutral palette that provides readability and visual balance.
- Tertiary: a restrained complementary accent palette for emphasis and important states.

Translate the palette into reusable design tokens rather than scattering arbitrary colour values throughout the code.

Preserve clear visual hierarchy and accessible contrast.

Do not use colour as the only means of communicating financial status.

### 10.3 Icons and visual language

Never use emoji in the application.

Use meaningful symbols or vector icons.

Prefer consistent inline SVG icons or another explicitly approved, lightweight icon approach.

Icons must be understandable, visually consistent, and accessible where appropriate.

### 10.4 Layout

Design a polished financial dashboard with:

- A clear navigation system.
- A business overview.
- Prominent financial summary metrics.
- Accessible transaction tables.
- Clear transaction-entry forms.
- Report views.
- Inventory and production views.
- Tax and business settings.
- Backup and restore controls.

The visual style should be professional, calm, precise, and appropriate for a financial application.

Avoid excessive decoration, unnecessary gradients, and animation that does not improve usability.

### 10.5 Responsive behaviour

The application must work on desktop and mobile browsers.

On smaller screens:

- Preserve access to the most important actions.
- Prevent financial tables from breaking the layout.
- Provide a reasonable table overflow or responsive transformation.
- Keep forms usable.
- Avoid clipped content and unreachable controls.

### 10.6 Accessibility

Use semantic HTML.

Associate labels with inputs.

Support keyboard navigation, visible focus states, understandable validation messages, and accessible dialog behaviour.

Maintain sufficient text and component contrast.

Respect reduced-motion preferences if animations are introduced.

---

## 11. Financial Precision and Validation

Financial applications require stricter numeric handling than ordinary websites.

### Monetary values

Avoid accumulating JavaScript floating-point errors.

Represent IDR monetary amounts using integer rupiah values wherever appropriate and within JavaScript's safe integer range.

Validate the safe range and reject values that cannot be represented accurately.

Define explicit rounding policies for calculations where fractional values or tax rules require rounding.

Do not apply arbitrary rounding to individual line items without understanding how it affects totals.

### Quantities and unit costs

Manufacturing may require fractional quantities, such as kilograms, metres, or litres.

Define a consistent precision strategy for quantities and unit costs. Prefer scaled integers or carefully controlled fixed-precision arithmetic where practical.

Document the allowed precision for each relevant unit.

### Dates

Use a consistent internal date representation.

Separate transaction dates from display formatting.

Apply reporting-period boundaries consistently.

Avoid timezone-dependent date shifts, especially for date-only transaction records.

### Validation

Validate at both the UI boundary and the domain boundary.

Important checks include:

- Missing required information.
- Invalid transaction dates.
- Negative or invalid quantities.
- Invalid monetary values.
- Insufficient stock.
- Unbalanced journal entries.
- Invalid account mappings.
- Duplicate imports.
- Inconsistent opening balances.
- Invalid restore files.
- Failed storage writes.

Never rely on frontend input constraints alone to preserve accounting integrity.

---

## 12. Manual Testing and Quality Assurance

Manual testing is the required primary acceptance method.

Do not introduce an automated test framework without approval.

Nevertheless, the accounting and domain logic should be structured so it can be tested independently from the UI.

Create a manual QA checklist containing:

- Test objective.
- Preconditions.
- Steps.
- Expected results.
- Actual results.
- Pass or fail status.

### Required accounting checks

At minimum, validate these cases:

1. A cash sale increases cash and recognised revenue.
2. A credit sale creates a receivable and recognises revenue when appropriate.
3. Collecting an existing receivable increases cash and reduces receivables without recognising the same revenue twice.
4. Buying inventory affects inventory and cash or payables appropriately.
5. Paying an existing payable does not record the original purchase twice.
6. Manufacturing consumes materials and accumulates valid production costs.
7. Completing production transfers appropriate costs from WIP to finished goods.
8. Selling finished goods records revenue and the appropriate cost of goods sold.
9. A transfer between business cash accounts does not create revenue or expense.
10. Loans, repayments, capital contributions, and owner withdrawals affect the appropriate accounts.
11. Opening balances must be balanced.
12. The Balance Sheet satisfies the accounting equation.
13. The Income Statement reports the correct period result.
14. The Cash Flow Statement reconciles consistently with relevant cash movements.
15. Report periods do not include transactions outside the selected dates.
16. A failed or invalid transaction does not corrupt existing records.
17. JSON backup and restore preserve the relevant application data.
18. CSV import rejects malformed data and identifies duplicates.
19. Tax results follow the configured profile and applicable verified rules.
20. Values remain consistent after refreshing the browser.

Include exact example amounts and expected results for critical accounting scenarios.

Do not claim that the application passes tests that have not actually been executed.

If you cannot execute the application in your environment, state that limitation and provide the manual steps required for verification.

---

## 13. Incremental Implementation Workflow

This is a strict requirement.

Work in small, well-defined stages. Do not build every feature at once.

**Complete only one phase at a time. After reporting the phase results, stop and request explicit approval before proceeding to the next phase.**

Do not interpret approval for one phase as approval for the entire project.

### Phase 0: Discovery, Architecture, and Requirements Baseline

Do not write application code yet.

First:

1. Inspect the existing repository and identify the available files, if repository access is available.
2. Preserve existing work and avoid overwriting files without justification.
3. Summarise the confirmed requirements and non-negotiable constraints.
4. Identify unresolved assumptions and their consequences.
5. Propose the repository structure.
6. Define the main application modules and data flow.
7. Propose the storage schema and versioning approach.
8. Define the transaction and journal-entry model.
9. Explain how the three financial statements will be derived.
10. Propose a basic manufacturing and inventory costing model.
11. Research the applicable Indonesian accounting baseline and the current tax rules from reliable official sources.
12. Separate confirmed requirements, recommendations, and decisions that still require approval.
13. Define the implementation roadmap and phase-specific acceptance criteria.

Do not attempt to resolve every future detail before work can begin.

Use sensible defaults for non-blocking decisions, clearly label them, and explain their implications.

For major decisions that affect financial correctness, data integrity, or the architecture, present a recommendation and wait for approval before implementing the affected subsystem.

At the end of Phase 0, provide a concise architecture and implementation proposal, then stop.

### Phase 1: Application Shell and Design System

After approval:

- Create the basic page structure.
- Implement navigation and a responsive application shell.
- Establish colour tokens, typography, spacing, buttons, forms, tables, and reusable UI patterns.
- Create appropriate empty states.
- Use realistic placeholder data only where needed to demonstrate layout.
- Keep placeholder figures visibly separate from actual financial records.

Do not pretend that placeholder dashboard totals are real accounting results.

Verify navigation, responsiveness, and visual hierarchy before proceeding.

Then stop and request approval.

### Phase 2: Business Configuration and Persistence Foundation

After approval:

- Implement business settings.
- Establish the chart of accounts.
- Implement opening-balance configuration.
- Implement the storage abstraction and schema versioning.
- Implement data validation and safe persistence.
- Implement agreed local access protection, if approved.
- Establish the JSON backup and restore foundation.

Verify that configuration and records survive browser refreshes and that invalid data is handled safely.

Then stop and request approval.

### Phase 3: Transaction Capture and Double-Entry Accounting

After approval:

- Implement simple business transaction forms.
- Implement the central accounting engine.
- Implement journal creation and validation.
- Implement cash, bank, sales, purchases, expenses, transfers, capital, loan, receivable, and payable flows within the approved scope.
- Ensure every posted journal entry is balanced.
- Implement appropriate correction and reversal flows.
- Create a transaction history with useful filters.

Verify the accounting invariants through manual scenarios before proceeding.

Then stop and request approval.

### Phase 4: Inventory and Manufacturing

After approval:

- Implement products and raw materials.
- Implement inventory quantities and valuation.
- Implement the agreed costing method.
- Implement Bills of Materials.
- Implement production batches.
- Implement direct material consumption.
- Implement labour and overhead cost allocation.
- Implement WIP and finished-goods movements.
- Integrate all manufacturing events with the accounting engine.

Verify production costs, inventory quantities, and related journal entries using explicit expected values.

Do not begin advanced manufacturing functionality unless it has been approved.

Then stop and request approval.

### Phase 5: Financial Reporting

After approval:

- Implement the Balance Sheet.
- Implement the Income Statement.
- Implement the Cash Flow Statement using the agreed direct-method classification.
- Implement date and period selection.
- Reconcile report values against the underlying accounting records.
- Add useful account-level detail and transaction drill-down where appropriate.

Verify the accounting equation, period boundaries, income recognition, inventory costs, and cash reconciliation.

Then stop and request approval.

### Phase 6: Tax Calculation

After approval:

- Implement the approved business tax profile.
- Implement the agreed tax calculations using verified current official rules.
- Use effective-dated and documented calculation rules.
- Implement relevant tax accounting entries and report integration.
- Clearly show tax bases, rates, assumptions, eligibility, and calculation results.
- Add manual test cases using verified official rules or reliable official examples.

If a tax category remains too broad or legally ambiguous, document the limitation and present a scoped recommendation rather than inventing a rule.

Do not silently mark unimplemented tax categories as supported.

Then stop and request approval.

### Phase 7: Data Interchange and Recovery

After approval:

- Complete JSON export and restore.
- Implement CSV transaction export.
- Implement CSV import with preview and validation.
- Implement duplicate handling.
- Add informative import and export results.
- Verify recovery from a valid backup and rejection of malformed backups.

If some functionality was implemented earlier, improve and verify it instead of duplicating it.

Then stop and request approval.

### Phase 8: Quality Assurance and Deployment

After approval:

- Run the manual QA checklist.
- Correct identified defects.
- Verify responsive behaviour and accessible interaction.
- Verify browser refresh persistence.
- Verify report and journal consistency.
- Verify that the static website works on Vercel.
- Document deployment and local development instructions.
- Explain the limitations of localStorage and the Tailwind CDN approach.
- Produce a concise release checklist.

Do not claim successful deployment or testing unless it has actually occurred.

Stop after presenting the results and any remaining limitations.

---

## 14. Mandatory Behaviour for Every Phase

At the beginning of each phase, state:

- The goal.
- The precise scope.
- The files or subsystems involved.
- The acceptance criteria.
- The important assumptions.

During implementation:

- Change only what is necessary for the current phase.
- Respect the approved architecture.
- Reuse established naming and design conventions.
- Keep accounting logic centralised.
- Avoid duplication.
- Avoid unrelated refactoring.
- Do not overwrite existing files without understanding their purpose.
- Do not introduce additional dependencies without approval.
- Do not leave fake implementations presented as completed features.
- Do not use hard-coded totals to simulate completed reports.
- Do not suppress important validation errors.
- Do not report success without verification.

If repository access or file-editing tools are available, inspect and modify the actual files. Otherwise, provide the complete contents of the files created or changed, with their paths and clear implementation instructions.

At the end of each phase, report:

1. What was implemented.
2. Which files were added or modified.
3. How to run or view the result.
4. Which checks were performed.
5. The actual test results, including failures.
6. Known limitations.
7. What the next phase will accomplish.

Then request explicit approval before continuing.

Do not continue implementing the next phase in the same response.

---

## 15. Definition of Done

A feature is not complete merely because it appears on screen.

A feature is complete when:

- Its user-facing behaviour matches the approved requirements.
- Its data model and accounting logic are defined.
- Input validation is implemented.
- Errors are handled appropriately.
- It integrates with the relevant application modules.
- Persistence works as intended.
- Its manual verification procedure exists.
- Its critical acceptance criteria have been checked.
- Its limitations are documented.

For accounting functionality, correctness is mandatory. A polished dashboard with incorrect journals or inconsistent reports is not an acceptable result.

For data-management functionality, preserving existing records is mandatory. An attractive import or restore screen that can silently damage financial history is not acceptable.

---

## 16. Final Instruction

Begin with **Phase 0 only**.

Inspect the existing project if available, consolidate the requirements, validate the important accounting and tax assumptions, recommend the architecture, and prepare a realistic phase-by-phase implementation plan.

Do not generate the complete application.

Do not begin Phase 1 until the user has reviewed and approved Phase 0.

Your objective is to build a dependable, understandable, local-first financial tracking application for Indonesian small manufacturing businesses, one verified phase at a time.
