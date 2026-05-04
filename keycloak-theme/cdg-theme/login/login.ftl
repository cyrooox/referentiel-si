<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password'); section>

    <#if section = "header">
        Référentiel SI
    <#elseif section = "form">

        <!-- ===== EN-TÊTE CDG ===== -->
        <div id="cdg-header">
            <img id="cdg-logo" src="${url.resourcesPath}/img/logo.png" alt="CDG Logo" />
            <div id="cdg-app-name">Référentiel SI</div>
            <div id="cdg-subtitle">CDG &bull; Caisse de Dépôt et de Gestion</div>
        </div>

        <!-- ===== FORMULAIRE ===== -->
        <form id="kc-form-login" action="${url.loginAction}" method="post">

            <!-- Username -->
            <div class="cdg-field">
                <label for="username">${msg("usernameOrEmail")}</label>
                <input tabindex="1" id="username" name="username"
                       type="text" autocomplete="username"
                       autofocus
                       value="${(login.username!'')}"
                       placeholder="votre@email.com" />
            </div>

            <!-- Password -->
            <div class="cdg-field">
                <div class="cdg-password-row">
                    <label for="password">${msg("password")}</label>
                    <#if realm.resetPasswordAllowed>
                        <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="cdg-forgot">
                            ${msg("doForgotPassword")}
                        </a>
                    </#if>
                </div>
                <div class="cdg-password-wrapper">
                    <input tabindex="2" id="password" name="password"
                           type="password" autocomplete="current-password"
                           placeholder="••••••••" />
                    <button type="button" id="cdg-toggle-password" onclick="togglePassword()" tabindex="-1" aria-label="Afficher le mot de passe">
                        <svg id="icon-eye" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <svg id="icon-eye-off" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Se souvenir de moi -->
            <#if realm.rememberMe && !usernameHidden??>
            <div class="cdg-remember">
                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"
                       <#if login.rememberMe??>checked</#if> />
                <label for="rememberMe">${msg("rememberMe")}</label>
            </div>
            </#if>

            <!-- Bouton connexion -->
            <input tabindex="4" type="submit" id="kc-login" value="${msg('doLogIn')}" />

        </form>

        <script>
            function togglePassword() {
                var p = document.getElementById('password');
                var eyeOn = document.getElementById('icon-eye');
                var eyeOff = document.getElementById('icon-eye-off');
                if (p.type === 'password') {
                    p.type = 'text';
                    eyeOn.style.display = 'none';
                    eyeOff.style.display = '';
                } else {
                    p.type = 'password';
                    eyeOn.style.display = '';
                    eyeOff.style.display = 'none';
                }
            }
        </script>

    </#if>
</@layout.registrationLayout>
