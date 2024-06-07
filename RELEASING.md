# Releasing

Releasing a new version of the runner involves triggering a specific GitHub Action.

## How to Release

Navigate to the [Release New Version workflow](../../actions/workflows/release.yml) to manually trigger the process. There is no need to create a tag or release beforehand as the workflow handles these steps.

A new release can originate from the `main` branch or any other branch.

### Options for Release
- **Release Type:** Choose from `major`, `minor`, or `patch` depending on the significance of the changes.
- **Pre-Release Flavor:** Options include `rc`, `beta`, or other identifiers. Absence of a flavor implies a stable and complete release.

### Guidelines

- **Release Type (major, minor, or patch):** Specify based on the changes you are releasing, adhering to [SemVer](https://semver.org/) guidelines.
  
- **Pre-Release Flavor (rc, beta, or anything):** For pre-releases, specify a flavor. Omitting a flavor designates the release as stable.

#### Note:
If updating an existing pre-release, do not specify a new release type; only update the flavor.

## Examples of Expected Behavior

| Current Version | Release Type | Pre-Release Flavor  | New Version |
|-----------------|--------------|---------------------|-------------|
| 1.5.7           | major        |                     | 2.0.0       |
| 1.5.7           | major        | rc                  | 2.0.0-rc.0  |
| 2.0.0-rc.0      |              | rc                  | 2.0.0-rc.1  |
| 2.0.0-rc.1      | major        |                     | 2.0.0       |

> **Important:**
> To prevent unintended version increments, avoid specifying both a release type and a pre-release flavor consecutively.
> 
> | Current Version | Release Type | Pre-Release Flavor  | New Version      |
> |-----------------|--------------|---------------------|------------------|
> | 1.5.7           | major        | rc                  | 2.0.0-rc.0       |
> | 2.0.0-rc.0      | major        | rc                  | ***3.0.0-rc.0*** |
