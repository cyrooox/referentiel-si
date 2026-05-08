<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>
    <#if section = "header">
        ${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <!-- ===== EN-TÊTE CDG ===== -->
        <div id="cdg-header">
            <img id="cdg-logo" src="${url.resourcesPath}/img/logo.png" alt="CDG Logo" />
            <div id="cdg-app-name">Référentiel SI</div>
            <div id="cdg-subtitle">Changement de mot de passe obligatoire</div>
        </div>

        <!-- ===== FORMULAIRE ===== -->
        <form id="kc-passwd-update-form" action="${url.loginAction}" method="post">
            <input type="text" id="username" name="username" value="${username}" autocomplete="username"
                   readonly="readonly" style="display:none;"/>
            <input type="password" id="password" name="password" autocomplete="current-password" style="display:none;"/>

            <!-- Nouveau Mot de Passe -->
            <div class="cdg-field">
                <label for="password-new">${msg("passwordNew")}</label>
                <div class="cdg-password-wrapper">
                    <input type="password" id="password-new" name="password-new" autofocus autocomplete="new-password" placeholder="Nouveau mot de passe" />
                </div>
            </div>

            <!-- Confirmation Mot de Passe -->
            <div class="cdg-field">
                <label for="password-confirm">${msg("passwordConfirm")}</label>
                <div class="cdg-password-wrapper">
                    <input type="password" id="password-confirm" name="password-confirm" autocomplete="new-password" placeholder="Confirmez le mot de passe" />
                </div>
            </div>

            <#if isAppInitiatedAction??>
            <div class="cdg-remember" style="margin-top: 15px;">
                <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked>
                <label for="logout-sessions">${msg("logoutOtherSessions")}</label>
            </div>
            </#if>

            <!-- Bouton validation -->
            <input tabindex="4" type="submit" id="kc-login" value="${msg('doSubmit')}" style="margin-top: 20px;" />

        </form>
    </#if>
</@layout.registrationLayout>
