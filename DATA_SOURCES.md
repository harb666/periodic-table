# Data sources & validation

ATOMIC.EXE uses a local, curated dataset. Nothing is fetched at runtime.

| Source | Used for | Licence | Vendored copy |
|---|---|---|---|
| [PubChem Periodic Table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) (NCBI/NIH), via the `periodic-table-data` npm package | Names (US spelling), phase at room temperature, melting/boiling points, discovery year, newer atomic weights, isotope masses for elements ≥ 103 | US Government work (public domain); package MIT | `data-sources/pubchem-elements.csv`, `data-sources/periodic-table-data-LICENSE` |
| [`periodic-table` npm package](https://github.com/andrejewski/periodic-table) | IUPAC standard atomic weights with uncertainties, mass numbers of long-lived isotopes | ISC | `data-sources/andrejewski-periodic-table.json` |
| [Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON) by Bowserinator | Electron shells, electron configurations, table layout (row/column), category, block, discoverer and namer | CC BY-SA 3.0 | `data-sources/bowserinator-PeriodicTableJSON.json`, `data-sources/bowserinator-LICENSE.md` |

`src/data/elements.generated.ts` is produced by `npm run data:build` (`scripts/build-elements.mjs`). Because it includes
material derived from Periodic-Table-JSON, that generated file is shared under **CC BY-SA 3.0**.

## How the merge works

* All three sources are checked to agree on atomic number and symbol for every element; the build fails otherwise.
* **Atomic mass**: IUPAC standard atomic weight (from `periodic-table`), replaced by the newer PubChem value when PubChem is precise
  to ≥ 2 decimals and differs beyond rounding (H, Be, F, Al, Ge, As, Se, Y, Nb, Mo, Cs, Pr, Ho, Tm). The build also fails if any two
  sources disagree by more than 1.5 u. Elements without a standard atomic weight show the mass number of a long-lived isotope in
  brackets, e.g. `[98]`.
* **Categories** follow the conventional families. Elements 109–118 are shown as "unknown properties", because their chemistry
  hasn't been measured.
* **Configurations** for Z ≥ 104 are labelled *predicted*. Phase and melting/boiling points are not shown for Z ≥ 100.
* **Discovery**: the source data mixes up who *named* an element with who *isolated* it in a few places (for example fluorine was
  listed as Ampère in 1670). About 30 entries were corrected from well-known chemistry history and are listed in
  `DISCOVERY_OVERRIDES` in the build script. **Limitation:** these corrections were not machine-checked against a single
  reference during the build (the reference sites weren't reachable from the build environment). Please review them before
  publishing. Disputed discoveries (for example nobelium, credited by IUPAC to Dubna in 1966) use the IUPAC-credited lab.
  Elements known since antiquity show "Known since ancient times".
* **Superheavy mass numbers** (Z ≥ 103) come from PubChem isotope masses rounded to whole numbers. Oganesson is set to [294],
  because Og-294 is the only isotope that has been observed. Values for the newest elements may change as research continues.

## Curated learning content

`src/data/content/part{1,2,3}.ts` holds, for every element, the kid-friendly explanation, exactly three facts, everyday uses, a
pronunciation guide, a safety note where appropriate, and a "Tell me more" paragraph. It was written conservatively:

* established textbook facts only;
* no shaky record claims ("the most…") unless they are well known;
* honest "made in labs, only a few atoms" wording for the superheavy elements.

Tests enforce exactly three facts per element and a safety note on every radioactive element.

## Automated checks (`tests/data.test.ts`)

* 118 elements, Z = 1…118 with no gaps, symbols matching an independent hard-coded IUPAC list.
* Electron shells and parsed configurations both sum to Z. Shell count matches the period, except palladium ([Kr] 4d¹⁰).
* Unique grid cells. Lanthanides 57–71 and actinides 89–103 sit in the separate f-block rows; all other elements have row = period
  and column = group.
* About 20 hand-written position anchors and atomic-mass anchors.

## Chemistry Lab & Atom Builder

* Lab reactions (`src/data/reactions.ts`) are standard balanced textbook equations. A test checks every equation conserves atoms.
  The lab never invents products for arbitrary element pairs.
* Atom Builder stability statements come only from a curated list of the stable isotopes of elements 1–20
  (`src/lib/atom.ts`). It also knows that Tc, Pm and every element above Pb have no stable isotopes. Beyond that, it says it has no
  data.
