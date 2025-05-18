$length = 64
$secret = -join ((65..90) + (97..122) + (48..57) + (35..38) | Get-Random -Count $length | ForEach-Object {[char]$_})

Write-Host "Generated JWT_SECRET:"
Write-Host $secret

# Create or update .env file
$envPath = ".env"
$envContent = Get-Content $envPath -ErrorAction SilentlyContinue

if ($envContent -match "JWT_SECRET=") {
    $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$secret"
} else {
    $envContent += "JWT_SECRET=$secret"
}

Set-Content $envPath $envContent

Write-Host "`nJWT_SECRET has been added to .env file"
Write-Host "Please restart your containers for the changes to take effect"
