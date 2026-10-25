
$WshShell = New-Object -ComObject WScript.Shell

# 1. Main 1-Click Launch on Desktop
$shortcutPath1 = "C:\\Users\\mothm\\Desktop\\Launch Bako's Master System.lnk"
$Shortcut1 = $WshShell.CreateShortcut($shortcutPath1)
$Shortcut1.TargetPath = "C:\\Users\\mothm\\Desktop\\Bako's Master System\\1-CLICK_LAUNCH.bat"
$Shortcut1.WorkingDirectory = "C:\\Users\\mothm\\Desktop\\Bako's Master System"
$Shortcut1.IconLocation = "C:\\Users\\mothm\\Desktop\\Bako's Master System\\server_icon.ico"
$Shortcut1.Description = "1-Click Launch for Bako's Master System (Production)"
$Shortcut1.Save()
Write-Host "Created Desktop Shortcut: Launch Bako's Master System.lnk"

# 2. Dev Mode (Hot Reload) Shortcut on Desktop
$shortcutPath2 = "C:\\Users\\mothm\\Desktop\\Bako's Master System (Dev Mode).lnk"
$Shortcut2 = $WshShell.CreateShortcut($shortcutPath2)
$Shortcut2.TargetPath = "C:\\Users\\mothm\\Desktop\\Bako's Master System\\1-CLICK_DEV_MODE.bat"
$Shortcut2.WorkingDirectory = "C:\\Users\\mothm\\Desktop\\Bako's Master System"
$Shortcut2.IconLocation = "C:\\Users\\mothm\\Desktop\\Bako's Master System\\server_icon.ico"
$Shortcut2.Description = "1-Click Dev Mode for Bako's Master System"
$Shortcut2.Save()
Write-Host "Created Desktop Shortcut: Bako's Master System (Dev Mode).lnk"
