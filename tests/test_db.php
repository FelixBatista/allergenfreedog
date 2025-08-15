<?php
require_once __DIR__ . '/../htdocs/lib/db.php';
putenv('DB_DSN=sqlite::memory:');
$db = new DB();
$db->init();
$db->addFood('Test', 'a,b');
$db->addFood('Another', 'x,y');
$foods = $db->allFoods();
if(count($foods) !== 2){
    echo "unexpected food count"; exit(1);
}
if($foods[0]['name'] !== 'Another'){
    echo "ordering failed"; exit(1);
}
echo "tests passed";
?>
