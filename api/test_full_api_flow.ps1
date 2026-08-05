cd D:\archive-management\api

chcp 65001
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$baseUrl = "http://127.0.0.1:8000"

function Login($username, $password) {
    $body = @{
        username = $username
        password = $password
    } | ConvertTo-Json

    $login = Invoke-RestMethod `
        -Uri "$baseUrl/api/auth/login/" `
        -Method Post `
        -Body $body `
        -ContentType "application/json; charset=utf-8"

    return $login.access
}

Write-Host "`n1. Login Admin..." -ForegroundColor Cyan
$adminAccess = Login "Admin" "Admin@123456789"
Write-Host "Admin OK" -ForegroundColor Green

Write-Host "`n2. Test search..." -ForegroundColor Cyan
$search = Invoke-RestMethod `
    -Uri "$baseUrl/api/search/profiles/?q=bao%20cao" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $adminAccess" }

Write-Host "Search total =" $search.data.pagination.total -ForegroundColor Green

Write-Host "`n3. Test preview PDF..." -ForegroundColor Cyan
curl.exe -I "$baseUrl/api/digital-files/1/preview/" `
  -H "Authorization: Bearer $adminAccess"

Write-Host "`n4. Test download PDF..." -ForegroundColor Cyan
curl.exe -L "$baseUrl/api/digital-files/1/download/" `
  -H "Authorization: Bearer $adminAccess" `
  -o final-download-test.pdf

Write-Host "Download file exists:"
Test-Path .\final-download-test.pdf

Write-Host "`n5. Test dashboard..." -ForegroundColor Cyan
$dashboard = Invoke-RestMethod `
    -Uri "$baseUrl/api/reports/dashboard/" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $adminAccess" }

$dashboard.data.summary | ConvertTo-Json -Depth 10

Write-Host "`n6. Test export Excel..." -ForegroundColor Cyan
curl.exe -L "$baseUrl/api/exports/profiles/excel/" `
  -H "Authorization: Bearer $adminAccess" `
  -o final-export-test.xlsx

Write-Host "Excel file exists:"
Test-Path .\final-export-test.xlsx

Write-Host "`n7. Test export PDF..." -ForegroundColor Cyan
curl.exe -L "$baseUrl/api/exports/profiles/pdf/" `
  -H "Authorization: Bearer $adminAccess" `
  -o final-export-test.pdf

Write-Host "PDF file exists:"
Test-Path .\final-export-test.pdf

Write-Host "`n8. Test role VIEWER không được tạo dữ liệu..." -ForegroundColor Cyan
$viewerAccess = Login "viewer" "Viewer@123456789"

curl.exe -i -X POST "$baseUrl/api/fonds/" `
  -H "Authorization: Bearer $viewerAccess" `
  -H "Content-Type: application/json; charset=utf-8" `
  -d '{ "code": "VIEWER-FINAL-TEST", "name": "Viewer final test" }'

Write-Host "`n9. Test không token bị chặn..." -ForegroundColor Cyan
curl.exe -i "$baseUrl/api/reports/dashboard/"

Write-Host "`nHOÀN THÀNH SCRIPT TEST TỔNG THỂ" -ForegroundColor Green
