# Quick Setup: OpenCode PR Agent

Get the OpenCode PR agent running in 2 minutes.

## Step 1: Enable GitHub Copilot

This workflow uses GitHub Copilot, which requires:
- GitHub Copilot subscription (Individual, Business, or Enterprise)
- Copilot must be enabled for your account/organization

Check your Copilot status:
1. Go to https://github.com/settings/copilot
2. Verify Copilot is active
3. If not subscribed, visit https://github.com/features/copilot to sign up

**Note**: The workflow uses the `GITHUB_TOKEN` which is automatically provided by GitHub Actions. No additional API keys needed!

## Step 2: Enable Workflow

The workflow is automatically enabled when you merge the `.github/workflows/opencode-pr-agent.yml` file to your main branch.

## Step 3: Test It

Create a test PR:

```bash
git checkout -b test-opencode-agent
echo "test" > test.txt
git add test.txt
git commit -m "Test OpenCode agent"
git push origin test-opencode-agent
```

Then create a PR on GitHub and watch the workflow run!

## Usage

### Option 1: Auto-triage (Automatic)
Just open a PR - OpenCode will review it automatically.

### Option 2: Auto-implement (Assignment)
Assign the PR to anyone - OpenCode will implement the feature.

### Option 3: Interactive (Comment)
Comment on any PR:
```
@opencode add validation for email input
```

## Verify It's Working

1. Go to **Actions** tab in your repository
2. Look for "OpenCode PR Agent" workflow runs
3. Check the workflow logs for details

## Troubleshooting

**Workflow doesn't run?**
- Verify GitHub Actions are enabled (Settings → Actions → General)
- Ensure the workflow file is in the default branch
- Check that you have GitHub Copilot enabled

**OpenCode doesn't respond?**
- Check workflow logs in Actions tab
- Verify GitHub Copilot is active for your account
- Make sure comment includes `@opencode` mention
- Ensure repository has Copilot access

**No Copilot subscription?**
- Visit https://github.com/features/copilot
- Sign up for GitHub Copilot Individual ($10/month)
- Or use organization/enterprise Copilot license

## Cost Management

GitHub Copilot costs:
- **Individual**: $10/month or $100/year (unlimited usage)
- **Business**: $19/user/month (billed annually)
- **Enterprise**: Contact GitHub Sales

No per-request costs - unlimited PR automation included with your Copilot subscription!

## Next Steps

- Read full documentation: `.github/workflows/README.md`
- Customize workflow triggers if needed
- Set up branch protection rules (recommended)

---

**Need help?** Comment `@opencode help` on any PR!
