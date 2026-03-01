param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [int]$MaxLines = 250
)

$bytes = [System.IO.File]::ReadAllBytes($Path)

# Try common encodings used by old Word HTML exports
$encodings = @(
  [System.Text.Encoding]::Unicode,
  [System.Text.Encoding]::UTF8,
  [System.Text.Encoding]::BigEndianUnicode,
  [System.Text.Encoding]::ASCII
)

$text = $null
foreach ($enc in $encodings) {
  try {
    $candidate = $enc.GetString($bytes)
    if ($candidate -match '<html' -or $candidate -match '<table' -or $candidate -match '<th') {
      $text = $candidate
      break
    }
  } catch {}
}

if (-not $text) {
  Write-Output 'FAILED_TO_DECODE_AS_HTML_TEXT'
  exit 2
}

$lines = $text -split "`r?`n"
$matches = $lines | Select-String -Pattern '<h1|<h2|<th|<title|الدور|لوحة|صلاحيات|إدارة|رابط|إنشاء|تحقق|عرض|حذف|إضافة|تعديل' -CaseSensitive:$false
$matches | Select-Object -First $MaxLines | ForEach-Object { $_.Line }
