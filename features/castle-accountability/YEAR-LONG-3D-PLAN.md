# Year-long 3D castle correction

User requirement: a genuine3D model assembled by purchasing3D construction elements with task-earned virtual money; completion must require at least a year of discipline. This supersedes the7-item illustrated endpoint and reference artwork as the castle itself. Retain the reference-style interface.

## Implementation decisions (builder defaults)

-120 individually purchased structural elements across12 construction phases. Fixed stable blueprint IDs; one purchase places one real model element. Orbit/zoom/reset controls and accessible textual construction summary. WebGL unavailable state must explain inability; no illustration masquerading as3D.
- Unlock day for piece index i:1+floor(i*364/119). Final piece requires365 distinct qualifying local days AND365 elapsed calendar days since activation. Only reflected task/partial-work earnings count toward each day's earnings goal; missions, purchases, exemptions and merely waiting never create qualifying days. Exempt days can qualify through actual work but do not count automatically. Count historical stored task earnings without fabricated dates.
- Prices expressed against activation's daily goal (stable initial goalCents): first piece1goal; middle118 pieces3goals each; final piece10goals. Full blueprint costs365 activation-goal days. These rates and counts are provisional defaults;365 qualifying days is a binding user requirement.
- Affordability, prerequisite, qualifying-day and date checks run on latest economy state at purchase, not only in UI. No debt-funded purchases. Double clicks idempotent. Final completion means all120 known pieces owned, not a large balance.
- Preserve existing7 legacy purchases, their prices, ledger entries, XP, reflections, account isolation and net worth. They remain historical assets and cannot falsely complete this larger blueprint. No destructive migration, refund, price rewrite or retroactive penalties.
- Genuine procedural Three.js geometry with shared materials/instanced repeated masonry and proper renderer disposal; dynamic import keeps3D out of the initial dashboard bundle. Render on demand, no permanent animation loop, keyboard/mobile controls, resize handling and reduced motion. Browser checks only in Orca's embedded browser.

## Work packages

1. Progression: domain/catalog module, meaningful tests for365 days, waiting, task vs mission earnings, duplicate purchase, old assets, import and goal history.
2. Model: isolated3D scene consuming ownedIds and the shared blueprint metadata; tests of geometry mapping where practical.
3. Integration: store phases/locked reasons/real prices, portfolio, long-term progress and accessible controls. Preserve commitments/reflection/exemptions/missions and current style.
4. Independent review; full tests/typecheck/build; embedded-browser WebGL/purchase/orbit/zoom/persistence checks. No commit/deploy.
