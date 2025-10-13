# Quick Start: Mutter-Post Migration

## ✅ Status: Ready to Deploy

All code is implemented. Just run the migration!

## 🚀 Quick Steps

```bash
# 1. Start database
cd /Users/weykon/Desktop/p/blog.weykon
docker-compose up -d postgres

# 2. Run migration
source .venv/bin/activate
python scripts/run_migration.py

# 3. Verify results
python scripts/migrate_content_types.py

# 4. Restart backend
cd backend
cargo run
```

## 🎯 Expected Results

- **52 posts** (formal blog articles)
- **81 mutters** (casual short posts)
- New routes: `/mutters`, `/api/mutters`
- Updated navigation with "Mutters" link

## 📖 Full Documentation

See `IMPLEMENTATION_GUIDE.md` for complete details.

## 🔗 Test URLs

After migration:
- Posts: http://localhost:3000/posts
- Mutters: http://localhost:3000/mutters
- API: http://localhost:3000/api/mutters

Done! 🎉
