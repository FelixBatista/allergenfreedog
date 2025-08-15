# AllergenFreeDog - Dog Food Comparison Tool

A comprehensive web application that helps dog owners identify problematic ingredients by comparing triggering foods (foods that caused problems) with safe foods (foods that didn't cause issues).

## Features

- **Two-Column Food Entry**: Separate sections for triggering and safe foods
- **Dynamic Food Addition**: Add multiple foods to each category
- **Ingredient Normalization**: Smart ingredient name matching and aliasing
- **Non-Similar Ingredient Detection**: Identifies ingredients unique to problematic foods
- **Safe Food Finder**: Test new foods against known problematic ingredients
- **Comprehensive Analysis**: Detailed ingredient breakdown with risk levels
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: PHP 7.4+
- **Database**: MySQL 5.7+
- **Architecture**: RESTful API with client-side rendering

## Installation on InfinityFree.com

### Prerequisites

1. **InfinityFree Account**: Sign up at [infinityfree.com](https://infinityfree.com)
2. **Domain**: Either use a free subdomain or connect your own domain
3. **Database**: Create a MySQL database through the InfinityFree control panel

### Step-by-Step Installation

#### 1. Database Setup

1. Log into your InfinityFree control panel
2. Go to "MySQL Databases" section
3. Create a new database:
   - **Database Name**: Choose a name (e.g., `allergenfreedog`)
   - **Username**: Create a database user
   - **Password**: Set a strong password
   - Note down these credentials

#### 2. Import Database Schema

1. In your database control panel, go to "phpMyAdmin"
2. Select your database
3. Go to "Import" tab
4. Choose the file `database/schema.sql`
5. Click "Go" to import the schema and sample data

#### 3. Configure Database Connection

1. Edit `config/database.php`
2. Update the database credentials:

```php
private $host = 'localhost';
private $dbname = 'your_database_name';        // The database name you created
private $username = 'your_username';           // The username you created
private $password = 'your_password';           // The password you set
```

#### 4. Upload Files

1. **Option A - File Manager (Recommended for beginners)**:
   - Go to "File Manager" in your control panel
   - Navigate to `htdocs` folder
   - Upload all files maintaining the folder structure

2. **Option B - FTP**:
   - Use an FTP client (FileZilla, WinSCP, etc.)
   - Connect using your FTP credentials from the control panel
   - Upload all files to the `htdocs` folder

#### 5. Set File Permissions

Ensure these files have proper permissions:
- `config/database.php`: 644
- All other PHP files: 644
- All directories: 755

#### 6. Test the Application

1. Visit your website URL
2. The application should load with sample data
3. Test the food comparison functionality

## File Structure

```
htdocs/
├── config/
│   └── database.php          # Database configuration
├── database/
│   └── schema.sql            # Database schema and sample data
├── api/
│   ├── food_catalog.php      # Food catalog operations
│   ├── ingredients.php       # Ingredient operations
│   ├── compare.php           # Food comparison logic
│   └── safe_food_finder.php  # Safe food testing
├── index.html                # Main application interface
└── README.md                 # This file
```

## Configuration Options

### Adding New Sample Foods

1. Edit `database/schema.sql`
2. Add new entries to the `food_catalog` table
3. Re-import the schema or manually insert via phpMyAdmin

### Modifying Ingredient Risk Levels

1. Edit `database/schema.sql`
2. Update the `ingredient_master` table entries
3. Re-import or update via phpMyAdmin

### Customizing the Application

- **Colors**: Edit CSS variables in `index.html`
- **Sample Data**: Modify the database schema file
- **API Endpoints**: Extend the PHP API files as needed

## Security Considerations

- **Database Credentials**: Keep `config/database.php` secure
- **Input Validation**: All user inputs are validated and sanitized
- **SQL Injection**: Uses prepared statements throughout
- **XSS Protection**: Output is properly escaped

## Performance Optimization

- **Database Indexes**: Already included in the schema
- **API Caching**: Consider implementing Redis for high-traffic sites
- **CDN**: Use InfinityFree's CDN for static assets

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify database credentials in `config/database.php`
   - Check if database exists and is accessible

2. **500 Internal Server Error**:
   - Check PHP error logs in your control panel
   - Verify file permissions
   - Ensure PHP version is 7.4 or higher

3. **API Endpoints Not Working**:
   - Check if `.htaccess` is properly configured
   - Verify file paths and permissions
   - Test individual API endpoints

4. **Page Not Loading**:
   - Check if all files are uploaded correctly
   - Verify the main `index.html` file is in the root directory
   - Check browser console for JavaScript errors

### Getting Help

1. Check the browser console for JavaScript errors
2. Review PHP error logs in your hosting control panel
3. Test individual API endpoints with tools like Postman
4. Verify database connectivity through phpMyAdmin

## Future Enhancements

- User accounts and dog profiles
- Food rating and review system
- Ingredient database expansion
- Mobile app development
- Integration with veterinary databases

## License

This project is open source and available under the MIT License.

## Support

For technical support or questions:
- Check the troubleshooting section above
- Review the code comments for implementation details
- Consider hiring a developer for custom modifications

---

**Note**: This application is for informational purposes only and should not replace veterinary advice. Always consult with a veterinarian for your dog's specific dietary needs. 