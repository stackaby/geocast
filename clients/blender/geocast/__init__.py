from .blender import register as g_register, unregister as g_unregister


def register():
   print("Registering")
   g_register()


def unregister():
   print("unregistering")
   g_unregister()
