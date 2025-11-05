#!/usr/bin/env python3
"""
SCRIPT COMPRESSION IMAGES - QUARTIER D'ARÔMES
Compresse automatiquement les images pour réduire le poids sans perte de qualité.

Usage:
    python compress_images.py                    # Compresser images existantes
    python compress_images.py --all              # Tout le dossier uploads
    python compress_images.py --file image.jpg   # Fichier spécifique

Features:
- Compression intelligente (JPEG 85%, PNG lossless)
- Création miniatures automatique
- Redimensionnement optimal (max 1200px)
- Préservation EXIF
- Backup automatique
- Rapport détaillé

@version 1.0
@date 2025-11-05
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageOps
import argparse
from datetime import datetime

class ImageCompressor:
    """Compresseur d'images avec options avancées"""
    
    def __init__(self, config=None):
        self.config = config or {
            'max_width': 1200,
            'max_height': 1200,
            'jpeg_quality': 85,
            'png_optimize': True,
            'create_thumbs': True,
            'thumb_size': (400, 400),
            'backup': True,
            'preserve_exif': True,
            'formats': ['.jpg', '.jpeg', '.png', '.webp']
        }
        
        self.stats = {
            'total_files': 0,
            'compressed': 0,
            'skipped': 0,
            'errors': 0,
            'original_size': 0,
            'compressed_size': 0
        }
    
    def compress_image(self, input_path, output_path=None, create_thumb=True):
        """
        Compresser une image
        
        Args:
            input_path (str): Chemin de l'image source
            output_path (str): Chemin de sortie (optionnel)
            create_thumb (bool): Créer miniature
            
        Returns:
            dict: Résultat de la compression
        """
        input_path = Path(input_path)
        
        if not input_path.exists():
            return {'success': False, 'error': 'Fichier inexistant'}
        
        if input_path.suffix.lower() not in self.config['formats']:
            return {'success': False, 'error': 'Format non supporté'}
        
        # Taille originale
        original_size = input_path.stat().st_size
        
        try:
            # Ouvrir image
            img = Image.open(input_path)
            
            # Convertir RGBA en RGB si nécessaire (pour JPEG)
            if img.mode in ('RGBA', 'LA', 'P') and input_path.suffix.lower() in ['.jpg', '.jpeg']:
                # Créer fond blanc
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = rgb_img
            
            # Rotation automatique selon EXIF
            if self.config['preserve_exif']:
                img = ImageOps.exif_transpose(img)
            
            # Redimensionner si trop grande
            if img.width > self.config['max_width'] or img.height > self.config['max_height']:
                img.thumbnail(
                    (self.config['max_width'], self.config['max_height']),
                    Image.Resampling.LANCZOS
                )
            
            # Output path
            if output_path is None:
                if self.config['backup']:
                    # Backup original
                    backup_path = input_path.parent / f"{input_path.stem}_original{input_path.suffix}"
                    if not backup_path.exists():
                        input_path.rename(backup_path)
                output_path = input_path
            else:
                output_path = Path(output_path)
                output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Sauvegarder avec compression
            save_kwargs = {}
            
            if input_path.suffix.lower() in ['.jpg', '.jpeg']:
                save_kwargs = {
                    'format': 'JPEG',
                    'quality': self.config['jpeg_quality'],
                    'optimize': True,
                    'progressive': True
                }
                if self.config['preserve_exif'] and 'exif' in img.info:
                    save_kwargs['exif'] = img.info['exif']
            
            elif input_path.suffix.lower() == '.png':
                save_kwargs = {
                    'format': 'PNG',
                    'optimize': self.config['png_optimize'],
                    'compress_level': 9
                }
            
            elif input_path.suffix.lower() == '.webp':
                save_kwargs = {
                    'format': 'WEBP',
                    'quality': self.config['jpeg_quality'],
                    'method': 6
                }
            
            img.save(output_path, **save_kwargs)
            
            # Créer miniature
            thumb_path = None
            if create_thumb and self.config['create_thumbs']:
                thumb_path = self.create_thumbnail(img, input_path)
            
            # Taille compressée
            compressed_size = output_path.stat().st_size
            reduction = ((original_size - compressed_size) / original_size) * 100
            
            return {
                'success': True,
                'original_size': original_size,
                'compressed_size': compressed_size,
                'reduction_percent': reduction,
                'output_path': str(output_path),
                'thumb_path': str(thumb_path) if thumb_path else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_thumbnail(self, img, original_path):
        """
        Créer une miniature
        
        Args:
            img: Image PIL
            original_path: Chemin original
            
        Returns:
            Path: Chemin de la miniature
        """
        original_path = Path(original_path)
        
        # Dossier thumbs
        thumb_dir = original_path.parent / 'thumbs'
        thumb_dir.mkdir(exist_ok=True)
        
        # Créer miniature
        thumb = img.copy()
        thumb.thumbnail(self.config['thumb_size'], Image.Resampling.LANCZOS)
        
        # Chemin miniature
        thumb_path = thumb_dir / f"{original_path.stem}_thumb{original_path.suffix}"
        
        # Sauvegarder
        save_kwargs = {}
        if original_path.suffix.lower() in ['.jpg', '.jpeg']:
            save_kwargs = {
                'format': 'JPEG',
                'quality': 80,
                'optimize': True
            }
        elif original_path.suffix.lower() == '.png':
            save_kwargs = {
                'format': 'PNG',
                'optimize': True
            }
        
        thumb.save(thumb_path, **save_kwargs)
        
        return thumb_path
    
    def compress_directory(self, directory, recursive=False):
        """
        Compresser tout un dossier
        
        Args:
            directory (str): Chemin du dossier
            recursive (bool): Traiter sous-dossiers
            
        Returns:
            dict: Statistiques
        """
        directory = Path(directory)
        
        if not directory.exists():
            print(f"❌ Dossier inexistant: {directory}")
            return self.stats
        
        # Pattern recherche
        pattern = '**/*' if recursive else '*'
        
        # Traiter chaque image
        for file_path in directory.glob(pattern):
            if file_path.is_file() and file_path.suffix.lower() in self.config['formats']:
                # Skip si déjà backup
                if '_original' in file_path.stem:
                    continue
                
                # Skip si dans dossier thumbs
                if 'thumbs' in file_path.parts:
                    continue
                
                self.stats['total_files'] += 1
                
                print(f"\n📸 Traitement: {file_path.name}")
                
                result = self.compress_image(file_path)
                
                if result['success']:
                    self.stats['compressed'] += 1
                    self.stats['original_size'] += result['original_size']
                    self.stats['compressed_size'] += result['compressed_size']
                    
                    print(f"   ✅ Compressé: {self.format_size(result['original_size'])} → "
                          f"{self.format_size(result['compressed_size'])} "
                          f"({result['reduction_percent']:.1f}% gain)")
                    
                    if result['thumb_path']:
                        print(f"   🖼️  Miniature: {Path(result['thumb_path']).name}")
                else:
                    self.stats['errors'] += 1
                    print(f"   ❌ Erreur: {result['error']}")
        
        return self.stats
    
    def print_stats(self):
        """Afficher statistiques"""
        print("\n" + "="*60)
        print("📊 RAPPORT DE COMPRESSION")
        print("="*60)
        print(f"Fichiers traités : {self.stats['total_files']}")
        print(f"Compressés       : {self.stats['compressed']}")
        print(f"Ignorés          : {self.stats['skipped']}")
        print(f"Erreurs          : {self.stats['errors']}")
        print("-"*60)
        print(f"Taille originale : {self.format_size(self.stats['original_size'])}")
        print(f"Taille finale    : {self.format_size(self.stats['compressed_size'])}")
        
        if self.stats['original_size'] > 0:
            total_reduction = ((self.stats['original_size'] - self.stats['compressed_size']) 
                             / self.stats['original_size']) * 100
            saved = self.stats['original_size'] - self.stats['compressed_size']
            print(f"Gain total       : {self.format_size(saved)} ({total_reduction:.1f}%)")
        
        print("="*60)
    
    @staticmethod
    def format_size(size_bytes):
        """Formater taille en octets"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"


def main():
    """Point d'entrée principal"""
    
    parser = argparse.ArgumentParser(
        description='Compression automatique d\'images pour Quartier d\'Arômes'
    )
    
    parser.add_argument(
        '--dir',
        default='static/uploads',
        help='Dossier à traiter (défaut: static/uploads)'
    )
    
    parser.add_argument(
        '--file',
        help='Fichier spécifique à compresser'
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help='Traiter tous les sous-dossiers'
    )
    
    parser.add_argument(
        '--quality',
        type=int,
        default=85,
        help='Qualité JPEG (1-100, défaut: 85)'
    )
    
    parser.add_argument(
        '--max-size',
        type=int,
        default=1200,
        help='Taille max (px, défaut: 1200)'
    )
    
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Ne pas créer de backup'
    )
    
    parser.add_argument(
        '--no-thumbs',
        action='store_true',
        help='Ne pas créer de miniatures'
    )
    
    args = parser.parse_args()
    
    # Configuration
    config = {
        'max_width': args.max_size,
        'max_height': args.max_size,
        'jpeg_quality': args.quality,
        'png_optimize': True,
        'create_thumbs': not args.no_thumbs,
        'thumb_size': (400, 400),
        'backup': not args.no_backup,
        'preserve_exif': True,
        'formats': ['.jpg', '.jpeg', '.png', '.webp']
    }
    
    # Créer compressor
    compressor = ImageCompressor(config)
    
    print("🖼️  COMPRESSION IMAGES - QUARTIER D'ARÔMES")
    print("="*60)
    print(f"Qualité JPEG     : {args.quality}%")
    print(f"Taille max       : {args.max_size}px")
    print(f"Backup           : {'Oui' if config['backup'] else 'Non'}")
    print(f"Miniatures       : {'Oui' if config['create_thumbs'] else 'Non'}")
    print("="*60)
    
    # Traiter
    if args.file:
        # Fichier spécifique
        result = compressor.compress_image(args.file)
        if result['success']:
            print(f"\n✅ {args.file}")
            print(f"   Compressé: {compressor.format_size(result['original_size'])} → "
                  f"{compressor.format_size(result['compressed_size'])} "
                  f"({result['reduction_percent']:.1f}% gain)")
        else:
            print(f"\n❌ Erreur: {result['error']}")
    else:
        # Dossier
        compressor.compress_directory(args.dir, recursive=args.all)
        compressor.print_stats()
    
    print("\n✨ Terminé!")


if __name__ == '__main__':
    # Vérifier Pillow installé
    try:
        from PIL import Image
    except ImportError:
        print("❌ Pillow non installé!")
        print("📦 Installation: pip install Pillow")
        sys.exit(1)
    
    main()
