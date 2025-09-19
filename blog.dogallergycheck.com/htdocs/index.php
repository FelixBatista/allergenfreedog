<?php
// Redirect from blog subdomain to main domain /blog
$redirect_url = 'https://dogallergycheck.com/blog' . $_SERVER['REQUEST_URI'];
header('Location: ' . $redirect_url, true, 301);
exit();
?>