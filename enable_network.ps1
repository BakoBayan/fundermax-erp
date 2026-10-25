# Delete existing rule if any
netsh advfirewall firewall delete rule name="Bako Panel Server Port 3000" | Out-Null

# Add inbound rule for port 3000 on any profile (Domain, Private, Public)
netsh advfirewall firewall add rule name="Bako Panel Server Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any

# Set network category to Private so Windows allows discovery and connections
Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | Set-NetConnectionProfile -NetworkCategory Private

# Also ensure node.exe is explicitly allowed
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    netsh advfirewall firewall add rule name="Node.js Server (Bako)" dir=in action=allow program="$nodePath" enable=yes profile=any
}

Write-Host "Firewall and Network Configuration complete! Phones and PCs can now connect." -ForegroundColor Green
Start-Sleep -Seconds 2
