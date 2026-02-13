import openmfd

c = openmfd.Component(size=(15,15,15), position=(0, 0, 0), px_size=0.01, layer_size=0.01)
c.add_port("p1", openmfd.Port(openmfd.Port.PortType.IN, position=(0, 5, 5), size=(5,5,5), surface_normal=openmfd.Port.SurfaceNormal.NEG_X))
c.add_port("p2", openmfd.Port(openmfd.Port.PortType.INOUT, position=(5, 0, 5), size=(5,5,5), surface_normal=openmfd.Port.SurfaceNormal.NEG_Y))
c.add_port("p3", openmfd.Port(openmfd.Port.PortType.OUT, position=(15, 5, 5), size=(5,5,5), surface_normal=openmfd.Port.SurfaceNormal.POS_X))

c.add_label("bulk", openmfd.Color(255, 0, 0, 255))
c.add_bulk("bulk_shape", openmfd.Cube(size=(10,10,10)), label="bulk")

c.preview()