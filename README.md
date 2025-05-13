# Typper Figma Plugin Deploy

A GitHub Action to automate the deployment of Figma plugins. This action handles the entire deployment process, from authentication to publishing, making continuous deployment of Figma plugins seamless and efficient.

## Features

- 🔐 Secure authentication with Figma
- 🚀 Automated plugin deployment
- 📝 Support for release notes
- 🔄 Continuous deployment ready
- 🎯 Simple configuration

## Usage

Add the following to your GitHub Actions workflow:

```yaml
name: Deploy Figma Plugin
on:
  push:
    branches:
      - main # or any branch you want to trigger the deployment

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Figma Plugin
        uses: typper-io/figma-plugin-deploy@v1
        with:
          plugin-id: "your-plugin-id"
          team-id: "your-team-id"
          release-notes: "New version release"
        env:
          FIGMA_EMAIL: ${{ secrets.FIGMA_EMAIL }}
          FIGMA_PASSWORD: ${{ secrets.FIGMA_PASSWORD }}
          FIGMA_TOTP_SECRET: ${{ secrets.FIGMA_TOTP_SECRET }}
```

## Inputs

| Input           | Description                    | Required |
| --------------- | ------------------------------ | -------- |
| `plugin-id`     | Your Figma plugin ID           | Yes      |
| `team-id`       | Your Figma team ID             | Yes      |
| `release-notes` | Release notes for this version | No       |

## Environment Variables

The action requires the following environment variables to be set:

| Variable            | Description                    |
| ------------------- | ------------------------------ |
| `FIGMA_EMAIL`       | Your Figma account email       |
| `FIGMA_PASSWORD`    | Your Figma account password    |
| `FIGMA_TOTP_SECRET` | Your Figma TOTP secret for 2FA |

## Security

It's recommended to store your Figma credentials as GitHub Secrets. Never commit these values directly in your workflow files.

## Requirements

- A Figma plugin project with a valid `manifest.json`
- GitHub repository with Actions enabled
- Figma account with 2FA enabled

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For support, please open an issue in the GitHub repository or contact the Typper team.

---

Made with ❤️ by [Typper](https://typper.io)
