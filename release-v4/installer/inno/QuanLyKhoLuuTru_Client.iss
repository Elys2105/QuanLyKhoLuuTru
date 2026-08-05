#define MyAppName "Quan Ly Kho Luu Tru Client"
#define MyAppVersion "4.0.0-dev"
#define MyAppPublisher "QuanLyKhoLuuTru"

[Setup]
AppId={{9F3D25C9-C5A5-42C2-A098-95CA50840302}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\QuanLyKhoLuuTru\Client
DefaultGroupName=Quan Ly Kho Luu Tru
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=D:\archive-management\release-v4\installer\output
OutputBaseFilename=QuanLyKhoLuuTru_Client_V4_03B_Setup
Compression=none
SolidCompression=no
SetupLogging=yes
UninstallDisplayIcon={app}\CLIENT_README.txt
LicenseFile=D:\archive-management\release-v4\installer\assets\LICENSE.txt
InfoAfterFile=D:\archive-management\release-v4\installer\assets\README_CLIENT.txt
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
UsePreviousAppDir=yes
UsePreviousGroup=yes
CreateUninstallRegKey=yes
Uninstallable=yes
VersionInfoVersion=4.0.0.0
VersionInfoCompany=QuanLyKhoLuuTru
VersionInfoDescription=Quan Ly Kho Luu Tru Client Installer
VersionInfoProductName=Quan Ly Kho Luu Tru Client
VersionInfoProductVersion=4.0.0.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Dirs]
Name: "{commonappdata}\QuanLyKhoLuuTru"
Name: "{commonappdata}\QuanLyKhoLuuTru\Client"

[Files]
Source: "D:\archive-management\release-v4\payload\client\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "D:\archive-management\release-v4\installer\assets\README_CLIENT.txt"; DestDir: "{app}"; DestName: "CLIENT_README.txt"; Flags: ignoreversion
Source: "D:\archive-management\release-v4\installer\scripts\CLIENT_POST_INSTALL.ps1"; DestDir: "{app}\installer-tools"; Flags: ignoreversion

[Icons]
Name: "{group}\Quan Ly Kho Luu Tru"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\launcher\OPEN_QUAN_LY_KHO.ps1"""
Name: "{commondesktop}\Quan Ly Kho Luu Tru"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\launcher\OPEN_QUAN_LY_KHO.ps1"""; Tasks: desktopicon
Name: "{group}\Huong dan Client"; Filename: "{app}\CLIENT_README.txt"

[Tasks]
Name: "desktopicon"; Description: "Tao shortcut Quan Ly Kho Luu Tru tren Desktop"; GroupDescription: "Shortcut:"; Flags: checkedonce

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installer-tools\CLIENT_POST_INSTALL.ps1"" -InstallRoot ""{app}"""; Flags: runhidden waituntilterminated
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\launcher\OPEN_QUAN_LY_KHO.ps1"""; Description: "Mo Quan Ly Kho Luu Tru"; Flags: postinstall skipifsilent nowait

[UninstallDelete]
Type: filesandordirs; Name: "{app}\installer-tools"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := IsWin64;
  if not Result then
    MsgBox('Bo cai Client chi ho tro Windows 64-bit.', mbError, MB_OK);
end;