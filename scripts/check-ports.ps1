$ports = @(8000, 3000)

foreach ($port in $ports) {
    $used = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    if ($used) {
        Write-Host "Port $port dang duoc su dung:" -ForegroundColor Yellow
        $used | Select-Object LocalAddress, LocalPort, State, OwningProcess
    } else {
        Write-Host "Port $port dang trong." -ForegroundColor Green
    }
}