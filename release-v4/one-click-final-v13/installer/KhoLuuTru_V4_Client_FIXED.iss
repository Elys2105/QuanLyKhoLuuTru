#define MyAppName "Quan Ly Kho Luu Tru Client"
#define MyAppVersion "4.0.0.13"
#define MyAppPublisher "QuanLyKhoLuuTru"

[Setup]
AppId={{98B4ED1A-C1D5-4934-A39A-CDA08B9C4668}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\QuanLyKhoLuuTru\Client
DefaultGroupName=Quan Ly Kho Luu Tru
DisableProgramGroupPage=yes
UsePreviousAppDir=yes
OutputDir=D:\\archive-management\\release-v4\\one-click-final-v13\\output
OutputBaseFilename=KhoLuuTru_V4_Client_Setup_FIXED
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes
UninstallDisplayName=Quan Ly Kho Luu Tru Client V4
Uninstallable=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "D:\\archive-management\\release-v4\\one-click-final-v13\\stage-client\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{commonappdata}\QuanLyKhoLuuTru\Client"
Name: "{commonappdata}\QuanLyKhoLuuTru\Client\config"
Name: "{commonappdata}\QuanLyKhoLuuTru\Client\logs"

[Code]
var
  ServerPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  ServerPage := CreateInputQueryPage(
    wpSelectDir,
    'Server connection',
    'Enter the Server IP address or hostname',
    'Examples: 192.168.1.20, SERVER-PC, or http://192.168.1.20:3000'
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
      MsgBox('Enter a valid Server IP address or hostname.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function StatusIsPass(StatusPath: String): Boolean;
var
  StatusText: AnsiString;
begin
  Result := False;
  if not FileExists(StatusPath) then
    Exit;
  if not LoadStringFromFile(StatusPath, StatusText) then
    Exit;
  Result := Pos('"status":"PASS"', String(StatusText)) > 0;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  AddressFile: String;
  StatusPath: String;
  Params: String;
  ResultCode: Integer;
  Started: Boolean;
  FailureMessage: String;
begin
  if CurStep = ssPostInstall then
  begin
    AddressFile := ExpandConstant('{tmp}\qlklt-server-address.txt');
    StatusPath := ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Client\config\install-status.json');
    DeleteFile(StatusPath);

    if not SaveStringToFile(AddressFile, Trim(ServerPage.Values[0]), False) then
      RaiseException('Could not create the temporary Server address file.');

    Params := '-NoProfile -ExecutionPolicy Bypass -File "' +
      ExpandConstant('{app}\bootstrap\POST_INSTALL_CLIENT_V13.ps1') +
      '" -InstallRoot "' + ExpandConstant('{app}') +
      '" -DataRoot "' + ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Client') +
      '" -ServerAddressFile "' + AddressFile + '"';

    Started := Exec(
      ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      Params,
      '',
      SW_HIDE,
      ewWaitUntilTerminated,
      ResultCode
    );
    DeleteFile(AddressFile);

    if not Started then
    begin
      FailureMessage := 'Could not start Client post-install. See logs under ' +
        ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Client\logs');
      MsgBox(FailureMessage, mbCriticalError, MB_OK);
      RaiseException(FailureMessage);
    end;

    if ResultCode <> 0 then
    begin
      FailureMessage := 'Client post-install failed with exit code ' + IntToStr(ResultCode) +
        '. See install-status.json and logs under ' +
        ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Client');
      MsgBox(FailureMessage, mbCriticalError, MB_OK);
      RaiseException(FailureMessage);
    end;

    if not StatusIsPass(StatusPath) then
    begin
      FailureMessage := 'Client post-install did not produce status PASS. See ' + StatusPath;
      MsgBox(FailureMessage, mbCriticalError, MB_OK);
      RaiseException(FailureMessage);
    end;
  end;
end;