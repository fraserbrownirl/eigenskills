# ClawHub Skills Staging

Raw skill zips from ClawHub go here before integration.

## Usage

1. Drop zip files here (e.g., `proactive-agent.zip`, `self-improving-agent.zip`)
2. Extract and review contents
3. Adapt to SkillsSeal format:
   - Create `registry/skills/{skill-name}/SKILL.md` with proper frontmatter
   - Add `[[wikilinks]]` to connect to skill graph
   - Update relevant MOC in `registry/graph/`
4. Run validation: `python scripts/validate-graph.py`
5. Regenerate registry: `python scripts/generate-registry.py`

## Not Processed

This folder is **not scanned** by `generate-registry.py` — only `registry/skills/*/SKILL.md` files are indexed. Zips and extracted folders here remain inert until manually integrated.
