<?php
// Simple test to verify the blog directory is accessible
echo "<h1>Blog Directory Test</h1>";
echo "<p>✅ Blog directory is accessible at: " . $_SERVER['REQUEST_URI'] . "</p>";
echo "<p>✅ Document root: " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
echo "<p>✅ Script path: " . __FILE__ . "</p>";
echo "<p>✅ Grav files exist: " . (file_exists('index.php') ? 'Yes' : 'No') . "</p>";
echo "<p>✅ System directory exists: " . (is_dir('system') ? 'Yes' : 'No') . "</p>";
echo "<p>✅ User directory exists: " . (is_dir('user') ? 'Yes' : 'No') . "</p>";
echo "<p>✅ Vendor directory exists: " . (is_dir('vendor') ? 'Yes' : 'No') . "</p>";
echo "<p><a href='index.php'>Try Grav Blog</a></p>";
?>
