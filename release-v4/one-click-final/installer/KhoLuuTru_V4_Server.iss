#define MyAppName "Quan Ly Kho Luu Tru Server"
#define MyAppVersion "4.0.0"
#define MyAppPublisher "QuanLyKhoLuuTru"

[Setup]
AppId={{4EC950D4-3B67-4FC6-A748-5F99EFD20819}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\QuanLyKhoLuuTru\Server
DefaultGroupName=Quan Ly Kho Luu Tru
OutputDir=D:\\archive-management\\release-v4\\one-click-final\\output
OutputBaseFilename=KhoLuuTru_V4_Server_Setup
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=none
SolidCompression=no
DiskSpanning=yes
DiskSliceSize=2000000000
SlicesPerDisk=1
WizardStyle=modern
UninstallDisplayName=Quan Ly Kho Luu Tru Server V4
SetupLogging=yes
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "D:\\archive-management\\release-v4\\one-click-final\\stage-server\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{commonappdata}\QuanLyKhoLuuTru\Server"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\logs"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\config"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\media"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\backups"

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\bootstrap\POST_INSTALL_SERVER.ps1"" -InstallRoot ""{app}"" -DataRoot ""{commonappdata}\QuanLyKhoLuuTru\Server"" -DatabasePassword ""{code:GetDatabasePassword}"""; StatusMsg: "Dang cai runtime, database va services. Qua trinh co the mat 10-30 phut..."; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Get-Service 'QuanLyKhoLuuTru-Frontend','QuanLyKhoLuuTru-Backend' -ErrorAction SilentlyContinue | Stop-Service -Force -ErrorAction SilentlyContinue; sc.exe delete 'QuanLyKhoLuuTru-Frontend'; sc.exe delete 'QuanLyKhoLuuTru-Backend'"""; Flags: runhidden waituntilterminated

[Code]
var
  DbPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  DbPage := CreateInputQueryPage(
    wpSelectDir,
    'Cau hinh PostgreSQL',
    'Nhap mat khau quan tri PostgreSQL',
    'Mat khau nay duoc dung de cai PostgreSQL va tao database. Toi thieu 8 ky tu.'
  );
  DbPage.Add('Mat khau PostgreSQL:', True);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = DbPage.ID then
  begin
    if Length(DbPage.Values[0]) < 8 then
    begin
      MsgBox('Mat khau PostgreSQL phai co it nhat 8 ky tu.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function GetDatabasePassword(Param: String): String;
begin
  Result := DbPage.Values[0];
end;