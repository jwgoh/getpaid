import { COOKIE_KEYS } from "@app/shared/config/config";

const COOKIE_NAME = COOKIE_KEYS.THEME_MODE;
const COLOR_SCHEME_ATTRIBUTE = "data-mui-color-scheme";

export const COLOR_SCHEME_INIT_SCRIPT = `(function(){try{var n='${COOKIE_NAME}';var m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));var c=m?m[1]:null;var mode=(c==='light'||c==='dark')?c:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('${COLOR_SCHEME_ATTRIBUTE}',mode);document.documentElement.style.colorScheme=mode;}catch(e){}})();`;
