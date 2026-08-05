#define MyAppName "Quan Ly Kho Luu Tru Client"
#define MyAppVersion "4.0.0"
#define MyAppPublisher "QuanLyKhoLuuTru"

[Setup]
AppId={{98B4ED1A-C1D5-4934-A39A-CDA08B9C4668}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\QuanLyKhoLuuTru\Client
DefaultGroupName=Quan Ly Kho Luu Tru
OutputDir=D:\\archive-management\\release-v4\\one-click-final\\output
OutputBaseFilename=KhoLuuTru_V4_Client_Setup
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Quan Ly Kho Luu Tru Client V4
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "D:\\archive-management\\release-v4\\one-click-final\\stage-client\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\bootstrap\CONFIGURE_CLIENT.ps1"" -ServerAddress ""{code:GetServerAddress}"""; StatusMsg: "Dang cau hinh ket noi Server..."; Flags: runhidden waituntilterminated

[Code]
var
  ServerPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  ServerPage := CreateInputQueryPage(
    wpSelectDir,
    'Cau hinh may chu',
    'Nhap IP hoac hostname cua Server',
    'Vi du: 192.168.1.20 hoac http://192.168.1.20:3000'
  );
  ServerPage.Add('Server:', False);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = ServerPage.ID then
  begin
    if Length(Trim(ServerPage.Values[0])) < 3 then
    begin
      MsgBox('Hay nhap IP hoac hostname Server.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function GetServerAddress(Param: String): String;
begin
  Result := Trim(ServerPage.Values[0]);
end;