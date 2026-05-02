param(
    [switch]$Build
)

$arguments = @("compose", "up")
if ($Build) {
    $arguments += "--build"
}

docker @arguments
exit $LASTEXITCODE
