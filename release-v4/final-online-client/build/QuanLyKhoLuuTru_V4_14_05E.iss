#define MyAppName "Quản Lý Kho Lưu Trữ"
#define MyAppVersion "4.14.05E"
#define MyOutputBaseName "QuanLyKhoLuuTru_V4_14_05E_Online_Client_Setup"

[Setup]
AppId={F8B8BE27-2C22-4C94-934A-7C4EE8D1F88B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher=QuanLyKhoLuuTru
AppPublisherURL=https://qlklt-v414-web-live.vercel.app/login
AppSupportURL=https://qlklt-v414-web-live.vercel.app/login
AppUpdatesURL=https://qlklt-v414-web-live.vercel.app/login
DefaultDirName={localappdata}\Programs\QuanLyKhoLuuTru
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=D:\archive-management\release-v4\final-online-client\output
OutputBaseFilename={#MyOutputBaseName}
SetupIconFile=D:\archive-management\release-v4\final-online-client\stage\QuanLyKhoLuuTru.ico
UninstallDisplayIcon={app}\QuanLyKhoLuuTru.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
MinVersion=10.0
CloseApplications=no
RestartApplications=no
RestartIfNeededByRun=no
AllowNoIcons=no
CreateUninstallRegKey=yes
Uninstallable=yes
VersionInfoVersion=4.14.5.0
VersionInfoCompany=QuanLyKhoLuuTru
VersionInfoDescription=Quan Ly Kho Luu Tru Online Client
VersionInfoProductName=Quan Ly Kho Luu Tru
VersionInfoProductVersion=4.14.05E

[Files]
Source: "D:\archive-management\release-v4\final-online-client\stage\QuanLyKhoLuuTru.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\archive-management\release-v4\final-online-client\stage\QuanLyKhoLuuTru.url"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\archive-management\release-v4\final-online-client\stage\HUONG_DAN_SU_DUNG.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\archive-management\release-v4\final-online-client\stage\VERSION.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\QuanLyKhoLuuTru.url"; IconFilename: "{app}\QuanLyKhoLuuTru.ico"
Name: "{userprograms}\{#MyAppName}"; Filename: "{app}\QuanLyKhoLuuTru.url"; IconFilename: "{app}\QuanLyKhoLuuTru.ico"
Name: "{userprograms}\{#MyAppName} - Hướng dẫn"; Filename: "{app}\HUONG_DAN_SU_DUNG.txt"
Name: "{userprograms}\Gỡ cài đặt {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\QuanLyKhoLuuTru.url"; Description: "Mở {#MyAppName}"; Flags: postinstall shellexec skipifsilent nowait

[UninstallDelete]
Type: files; Name: "{app}\QuanLyKhoLuuTru.url"
Type: files; Name: "{app}\QuanLyKhoLuuTru.ico"
Type: files; Name: "{app}\HUONG_DAN_SU_DUNG.txt"
Type: files; Name: "{app}\VERSION.txt"
Type: dirifempty; Name: "{app}"