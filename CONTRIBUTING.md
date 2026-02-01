# Contributing

PRs welcome! Here's what helps:

## Adding a New Skill

1. Create folder in `skills/` with your skill name (lowercase, hyphens)
2. Add `SKILL.md` with YAML frontmatter (`name`, `description`, `homepage`)
3. Copy `scripts/tapi-auth.js` from an existing skill
4. Submit PR

## Improving Existing Skills

- Better trigger phrases in descriptions
- Clearer examples
- Bug fixes in auth script

## Quality Checklist

- [ ] SKILL.md has proper frontmatter
- [ ] Description includes when-to-use phrases
- [ ] scripts/tapi-auth.js is present
- [ ] Tested with `npx skills add` locally

## Questions?

Open an issue or reach out at [transcriptapi.com](https://transcriptapi.com).
