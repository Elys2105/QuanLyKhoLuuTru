$ErrorActionPreference = "Stop"

Set-Location "D:\archive-management\web"

if (!(Test-Path ".next")) {
    npm run build
}

npm run start