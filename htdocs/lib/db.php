<?php
class DB {
    private $pdo;
    public function __construct(){
        $dsn = getenv('DB_DSN');
        if(!$dsn){
            $dsn = 'sqlite:' . __DIR__ . '/../data/foods.db';
        }
        $user = getenv('DB_USER') ?: null;
        $pass = getenv('DB_PASS') ?: null;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ];
        $this->pdo = new PDO($dsn, $user, $pass, $options);
    }
    public function init(){
        $driver = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if($driver === 'mysql'){
            $this->pdo->exec('CREATE TABLE IF NOT EXISTS foods (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                ingredients TEXT NOT NULL
            )');
        } else {
            $this->pdo->exec('CREATE TABLE IF NOT EXISTS foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                ingredients TEXT NOT NULL
            )');
        }
    }
    public function allFoods(){
        $stmt = $this->pdo->query('SELECT name, ingredients FROM foods ORDER BY name');
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    public function addFood($name,$ingredients){
        $stmt = $this->pdo->prepare('INSERT OR IGNORE INTO foods (name,ingredients) VALUES(?,?)');
        $stmt->execute([$name,$ingredients]);
    }
}
?>
