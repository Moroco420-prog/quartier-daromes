"""
Script de migration pour ajouter user_id à cart_items
Corrige l'erreur: Entity namespace for "cart_items" has no property "user_id"
"""

import sqlite3
import os

# Chemin vers la base de données
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'database', 'quartier.db')

print("=" * 60)
print("MIGRATION: Ajout de user_id à cart_items")
print("=" * 60)
print()

if not os.path.exists(db_path):
    print(f"❌ Base de données introuvable: {db_path}")
    print("Veuillez d'abord créer la base de données.")
    exit(1)

# Connexion à la base de données
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Vérifier si la colonne user_id existe déjà
    cursor.execute("PRAGMA table_info(cart_items)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'user_id' in columns:
        print("✅ La colonne user_id existe déjà dans cart_items")
        print("   Aucune migration nécessaire.")
    else:
        print("📝 Ajout de la colonne user_id à cart_items...")
        
        # Étape 1: Créer une nouvelle table avec la bonne structure
        cursor.execute("""
            CREATE TABLE cart_items_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        """)
        print("   ✓ Nouvelle table cart_items_new créée")
        
        # Étape 2: Migrer les données existantes (via la table carts)
        cursor.execute("""
            INSERT INTO cart_items_new (id, user_id, product_id, quantity, added_at)
            SELECT ci.id, c.user_id, ci.product_id, ci.quantity, ci.added_at
            FROM cart_items ci
            INNER JOIN carts c ON ci.cart_id = c.id
        """)
        migrated = cursor.rowcount
        print(f"   ✓ {migrated} articles migrés avec succès")
        
        # Étape 3: Supprimer l'ancienne table
        cursor.execute("DROP TABLE cart_items")
        print("   ✓ Ancienne table supprimée")
        
        # Étape 4: Renommer la nouvelle table
        cursor.execute("ALTER TABLE cart_items_new RENAME TO cart_items")
        print("   ✓ Nouvelle table renommée")
        
        # Commit des changements
        conn.commit()
        print()
        print("✅ Migration terminée avec succès !")
        print(f"   {migrated} articles de panier ont été migrés")
    
    # Afficher les statistiques
    cursor.execute("SELECT COUNT(*) FROM cart_items")
    total_items = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT user_id) FROM cart_items")
    total_users = cursor.fetchone()[0]
    
    print()
    print("📊 STATISTIQUES:")
    print(f"   - Articles dans le panier: {total_items}")
    print(f"   - Utilisateurs avec panier: {total_users}")
    
except sqlite3.Error as e:
    conn.rollback()
    print(f"❌ ERREUR: {e}")
    print("   La migration a échoué. La base de données n'a pas été modifiée.")
    
finally:
    conn.close()

print()
print("=" * 60)
print("Vous pouvez maintenant relancer le serveur Flask")
print("=" * 60)
