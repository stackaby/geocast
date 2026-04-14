"""Bootstrap script to set up virtualenv site-packages before running blender.py."""

import os
import sys

if virtual_env := os.environ.get("VIRTUAL_ENV"):
   site_packages = os.path.join(
      virtual_env,
      "lib",
      f"python{sys.version_info.major}.{sys.version_info.minor}",
      "site-packages",
   )

   if site_packages not in sys.path:
      sys.path.insert(0, site_packages)

# Handle PYTHONPATH
if pythonpath := os.environ.get("PYTHONPATH"):
   sep = ":" if sys.platform != "win32" else ";"

   for path in pythonpath.split(sep):
      if path not in sys.path:
         sys.path.insert(0, path)

from geocast.blender import main

if __name__ == "__main__":
   main()
