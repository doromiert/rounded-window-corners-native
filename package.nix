{lib,stdenvNoCC,glib,gettext,nodejs,gjs,gtk4,libadwaita,makeWrapper,wrapGAppsHook4,gobject-introspection}:
stdenvNoCC.mkDerivation {
  pname="gnome-shell-extension-rounded-window-corners-native";
  version="51.1-gnome50.1";
  src=lib.cleanSource ./.;
  nativeBuildInputs=[glib gettext makeWrapper wrapGAppsHook4 gobject-introspection];
  buildInputs=[gtk4 libadwaita];
  nativeCheckInputs=[nodejs];
  doCheck=true;
  doInstallCheck=true;
  dontWrapGApps=true;
  postPatch=''
    substituteInPlace lib/styleResolver.js \
      --replace-fail "['gjs', '-m', this._probeScript]" \
        "['$out/libexec/rounded-corners-gjs', '-m', this._probeScript]"
  '';
  buildPhase="bash scripts/compile.sh";
  checkPhase="bash tests/unit/run.sh";
  installPhase=''
    destination="$out/share/gnome-shell/extensions/rounded-window-corners@ztrahmet.github.io"
    mkdir -p "$destination" "$out/libexec"
    cp extension.js prefs.js metadata.json LICENSE "$destination/"
    cp -r lib prefs tools schemas locale "$destination/"
  '';
  postFixup=''
    makeWrapper ${gjs}/bin/gjs "$out/libexec/rounded-corners-gjs" \
      "''${gappsWrapperArgs[@]}" --set GIO_EXTRA_MODULES ""
  '';
  installCheckPhase=''
    extension="$out/share/gnome-shell/extensions/rounded-window-corners@ztrahmet.github.io"
    "$out/libexec/rounded-corners-gjs" -m "$extension/tools/adw-probe.js" > adwaita.css
    test -s adwaita.css
    GSETTINGS_BACKEND=memory GSETTINGS_SCHEMA_DIR="$extension/schemas" \
      "$out/libexec/rounded-corners-gjs" -c \
      "if (!new imports.gi.Gio.Settings({schema_id:'org.gnome.shell.extensions.rounded-window-corners-native'}).get_boolean('sharp-windows')) throw Error('Sharp rendering default is off');"
  '';
  passthru.extensionUuid="rounded-window-corners@ztrahmet.github.io";
  meta={
    description="Rounded corners with sharp fractional scaling for GNOME50";
    homepage="https://github.com/ztrahmet/rounded-window-corners";
    license=lib.licenses.gpl3Plus;
    platforms=lib.platforms.linux;
  };
}
