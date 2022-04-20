# Releasing

Releasing a new version of the runner requires a Github Action to be triggered.

## How to release

The workflow is named [Release New Version](../../actions/workflows/release.yml).\
It has to be manually trigger, *without* creating a tag before or a release, everything will be taken care of.

A new release can be made either from `main`, or any other branch.

Two settings are available:
- `Release type - major, minor or patch`
- `Pre-Release flavor - rc, beta, or anything`

### Release type - major, minor or patch

Type-in the expected value depending the changes you are releasing.\
This is intended to be respectul of [SemVer](https://semver.org/)

### Pre-Release flavor - rc, beta, or anything

To publish a pre-release, you need to define a flavor. Any release without flavor is assumed to be a stable and complete release.

> Nota:
>   If you need to update the same flavor, you *must not* specify a release type.

## Examples

Expected behavior depending inputs

| Current Version | Release type value | Pre-Release flavor | New version |
| --- | --- | --- | --- |
| 1.5.7 | major | | 2.0.0 |
| 1.5.7 | major | rc | 2.0.0-rc.0 |
| 2.0.0-rc.0 |  | rc | 2.0.0-rc.1 |
| 2.0.0-rc.1 | major | | 2.0.0 |


> Avoid specifying twice in a row both `release type` and `pre-release flavor`, as it will increase version.
>
> | Current Version | Release type value | Pre-Release flavor | New version |
> | --- | --- | --- | --- |
> | 1.5.7 | major | rc | 2.0.0-rc.0 |
> | 2.0.0-rc.0 | major | rc | ***3.0.0-rc.0*** |
