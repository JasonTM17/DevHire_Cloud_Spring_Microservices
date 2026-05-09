[CmdletBinding()]
param(
    [string]$ExpectedDir = "docs/screenshots/stitch",
    [string]$ActualDir = "frontend/test-results/stitch-route-matrix",
    [string]$ReportDir = "reports/pixel-diff",
    [int]$AllowedDiffPixels = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$expectedRoot = if ([System.IO.Path]::IsPathRooted($ExpectedDir)) {
    [System.IO.Path]::GetFullPath($ExpectedDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ExpectedDir))
}
$actualRoot = if ([System.IO.Path]::IsPathRooted($ActualDir)) {
    [System.IO.Path]::GetFullPath($ActualDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ActualDir))
}
$reportRoot = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
    [System.IO.Path]::GetFullPath($ReportDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ReportDir))
}

if (-not (Test-Path -LiteralPath $expectedRoot)) {
    throw "Expected screenshot directory is missing: $expectedRoot"
}
if (-not (Test-Path -LiteralPath $actualRoot)) {
    throw "Actual screenshot directory is missing: $actualRoot. Run: cd frontend; npm run screenshots:stitch"
}

$source = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class StitchPngDiffResult {
  public int ExpectedWidth;
  public int ExpectedHeight;
  public int ActualWidth;
  public int ActualHeight;
  public long TotalPixels;
  public long DiffPixels;
  public long MissingPixels;
  public int MaxChannelDelta;
}

public static class StitchPngExactDiff {
  public static StitchPngDiffResult Compare(string expectedPath, string actualPath) {
    using (var expectedSource = new Bitmap(expectedPath))
    using (var actualSource = new Bitmap(actualPath)) {
      int width = Math.Max(expectedSource.Width, actualSource.Width);
      int height = Math.Max(expectedSource.Height, actualSource.Height);
      using (var expected = Normalize(expectedSource, width, height))
      using (var actual = Normalize(actualSource, width, height)) {
        byte[] left = ReadBytes(expected);
        byte[] right = ReadBytes(actual);
        int stride = width * 4;
        long diff = 0;
        int maxDelta = 0;

        for (int y = 0; y < height; y++) {
          int row = y * stride;
          for (int x = 0; x < width; x++) {
            int i = row + (x * 4);
            int db = Math.Abs(left[i] - right[i]);
            int dg = Math.Abs(left[i + 1] - right[i + 1]);
            int dr = Math.Abs(left[i + 2] - right[i + 2]);
            int da = Math.Abs(left[i + 3] - right[i + 3]);
            int localMax = Math.Max(Math.Max(db, dg), Math.Max(dr, da));
            if (localMax != 0) {
              diff++;
              if (localMax > maxDelta) maxDelta = localMax;
            }
          }
        }

        long expectedPixels = (long)expectedSource.Width * expectedSource.Height;
        long actualPixels = (long)actualSource.Width * actualSource.Height;
        long overlapPixels = (long)Math.Min(expectedSource.Width, actualSource.Width) * Math.Min(expectedSource.Height, actualSource.Height);
        long missing = (expectedPixels + actualPixels) - (2L * overlapPixels);

        return new StitchPngDiffResult {
          ExpectedWidth = expectedSource.Width,
          ExpectedHeight = expectedSource.Height,
          ActualWidth = actualSource.Width,
          ActualHeight = actualSource.Height,
          TotalPixels = (long)width * height,
          DiffPixels = diff,
          MissingPixels = missing,
          MaxChannelDelta = maxDelta
        };
      }
    }
  }

  private static Bitmap Normalize(Bitmap source, int width, int height) {
    var target = new Bitmap(width, height, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(target)) {
      g.Clear(Color.Transparent);
      g.DrawImageUnscaled(source, 0, 0);
    }
    return target;
  }

  private static byte[] ReadBytes(Bitmap bitmap) {
    var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
    var data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    try {
      int stride = Math.Abs(data.Stride);
      byte[] buffer = new byte[stride * bitmap.Height];
      for (int y = 0; y < bitmap.Height; y++) {
        IntPtr source = IntPtr.Add(data.Scan0, y * data.Stride);
        Marshal.Copy(source, buffer, y * stride, stride);
      }
      return buffer;
    } finally {
      bitmap.UnlockBits(data);
    }
  }
}
"@

Add-Type -TypeDefinition $source -ReferencedAssemblies @("System.Drawing.dll")

$rows = @()
Get-ChildItem -File -Filter "*.png" $expectedRoot | Sort-Object Name | ForEach-Object {
    $actualPath = Join-Path $actualRoot $_.Name
    if (-not (Test-Path -LiteralPath $actualPath)) {
        $rows += [pscustomobject]@{
            file = $_.Name
            status = "missing-actual"
            expected = ""
            actual = ""
            totalPixels = 0
            diffPixels = 0
            diffPercent = 100.0
            missingPixels = 0
            maxChannelDelta = 0
        }
        return
    }

    $diff = [StitchPngExactDiff]::Compare($_.FullName, $actualPath)
    $diffPercent = if ($diff.TotalPixels -eq 0) {
        0
    } else {
        [Math]::Round(($diff.DiffPixels / $diff.TotalPixels) * 100, 6)
    }

    $rows += [pscustomobject]@{
        file = $_.Name
        status = if ($diff.DiffPixels -eq 0) { "exact" } else { "different" }
        expected = "$($diff.ExpectedWidth)x$($diff.ExpectedHeight)"
        actual = "$($diff.ActualWidth)x$($diff.ActualHeight)"
        totalPixels = $diff.TotalPixels
        diffPixels = $diff.DiffPixels
        diffPercent = $diffPercent
        missingPixels = $diff.MissingPixels
        maxChannelDelta = $diff.MaxChannelDelta
    }
}

New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $reportRoot "stitch-pixel-diff-$stamp.json"
$mdPath = Join-Path $reportRoot "stitch-pixel-diff-$stamp.md"
$ordered = $rows | Sort-Object -Property @{ Expression = "diffPercent"; Descending = $true }, @{ Expression = "file"; Descending = $false }
$rows | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$lines = @(
    "# Stitch Pixel Diff",
    "",
    "Generated: $(Get-Date -Format o)",
    "",
    "| File | Status | Expected | Actual | Diff pixels | Diff % | Missing pixels | Max channel delta |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |"
)
foreach ($row in $ordered) {
    $lines += "| $($row.file) | $($row.status) | $($row.expected) | $($row.actual) | $($row.diffPixels) | $($row.diffPercent) | $($row.missingPixels) | $($row.maxChannelDelta) |"
}
$lines | Set-Content -LiteralPath $mdPath -Encoding UTF8

$summary = [pscustomobject]@{
    compared = $rows.Count
    exact = @($rows | Where-Object status -eq "exact").Count
    different = @($rows | Where-Object status -eq "different").Count
    missing = @($rows | Where-Object status -eq "missing-actual").Count
    maxDiffPercent = (($rows | Measure-Object -Property diffPercent -Maximum).Maximum)
    totalDiffPixels = (($rows | Measure-Object -Property diffPixels -Sum).Sum)
    reportJson = $jsonPath
    reportMarkdown = $mdPath
}

$summary | Format-List | Out-String | Write-Host
$ordered | Format-Table -AutoSize | Out-String | Write-Host

if ($summary.totalDiffPixels -gt $AllowedDiffPixels -or $summary.missing -gt 0) {
    throw "Stitch pixel diff failed: $($summary.totalDiffPixels) pixel(s) differ across $($summary.different) screenshot(s), missing $($summary.missing)."
}

Write-Host "Stitch pixel diff passed."
