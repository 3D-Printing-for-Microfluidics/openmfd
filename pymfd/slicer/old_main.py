def slice_stl(stl, slices_folder, slicer_settings):
    settings = stl["settings"]

    light_engine = slicer_settings["light_engines"][settings["le"]]
    size = light_engine["resolution"]
    pixel_pitch_um = light_engine["pitch"]

    width = size[0]
    height = size[1]

    if sys.platform == "win32":
        python_executable = "env\Scripts\python.exe"
    else:
        python_executable = "env/bin/python"

    return subprocess.Popen(
        [
            python_executable,
            "utils/slicer/app_qt.py",
            settings["stl_path"],
            str(float(settings["layer_thickness_um"]) / 1000),
            str(width),
            str(height),
            str(pixel_pitch_um / 1000),
            f"--slicesFolder={slices_folder}",
            # f"--sliceSaveName={stl['uuid']}",
        ]
    )

    # _ = generate_slices(
    #     stl_value["stl_path"],
    #     float(stl_value["layer_thickness_um"]) / 1000,
    #     width,
    #     height,
    #     pixel_pitch_um / 1000,
    #     sliceSaveName=slice_save_name,
    #     slicesFolder=slices_folder,
    #     progress_handle=progress_handle,
    # )


def membrane_images(stl, image_paths, slices_folder):
    settings = stl["settings"]
    if settings["en_membranes"]:
        print("Generating membranes...")
        return generate_membrane_images(
            image_paths=image_paths,
            slices_folder=slices_folder,
            membrane_thickness=int(settings["membrane_thickness"]),
            widen_by_px=int(settings["membrane_dilation"]),
            layers_to_check=expand_string_range(settings["membrane_layers"]),
            progress=progress_handle,
        )
    return True


def secondary_images(stl, image_paths, slices_folder):
    settings = stl["settings"]

    roof_dose = float(settings[f"roof_exp_time_ms"])
    edge_dose = float(settings[f"secondary_exp_time_ms"])
    bulk_dose = float(settings[f"exp_time_ms"])

    # double check that dosing is valid
    if roof_dose == bulk_dose and settings["en_roof"]:
        settings["en_roof"] = False
    if edge_dose == bulk_dose and settings["en_secondary"]:
        settings["en_secondary"] = False

    if settings["en_secondary"] or settings["en_roof"]:
        print("Generating roof/edge images...")

        narrow_by_px = int(settings["secondary_dilation_size_px"])
        widen_by_px = int(settings["secondary_erosion_size_px"])
        if (not settings["en_secondary"]) or settings["secondary_is_erosion"]:
            narrow_by_px = 0
        if (not settings["en_secondary"]) or settings["secondary_is_dilation"]:
            widen_by_px = 0

        return generate_secondary_images(
            image_paths=image_paths,
            slices_folder=slices_folder,
            edge_enabled=settings["en_secondary"],
            roof_enabled=settings["en_roof"],
            narrow_by_px=narrow_by_px,
            widen_by_px=widen_by_px,
            roof_widen_by_px=int(settings["roof_erosion_size_px"]),
            layers_above=int(settings["secondary_layers_above"]),
            roof_dose=roof_dose,
            edge_dose=edge_dose,
            bulk_dose=bulk_dose,
            layers_to_check=expand_string_range(settings["secondary_layers"]),
            progress=progress_handle,
        )
    return True


def generate_printfile(
    design_settings, main_settings, stl_list, stl_settings, slicer_settings
):
    
    if main_settings["zip_output"] and Path(main_settings["output_path"]).exists():
        print("Output path already exists. Please select a different path.")
        return False
    elif not main_settings["zip_output"] and Path(Path(main_settings["output_path"]).parent / Path(main_settings["output_path"]).stem).exists():
        print("Output path already exists. Please select a different path.")
        return False

    temp_directory = f"tmp_{datetime.now().__format__('%Y-%m-%d_%H-%M-%S')}"
    os.mkdir(temp_directory)

    # Copy scad files
    # for stl in stl_settings:
    stls = []
    for i in range(len(stl_list)):
        settings = stl_settings[i]
        stl_path = Path(settings["stl_path"])
        indexes_of_stl = list(np.where(np.array(stl_list) == stl_path.name)[0])

        # Unique directories empty directory
        if len(indexes_of_stl) == 1:
            # STL is unique
            stl_uuid = stl_path.stem
            folder_path = f"{temp_directory}/{stl_uuid}"
        else:
            # STL is not unique
            stl_uuid = f"{stl_path.stem}_{str(uuid.uuid4())[0:8]}"
            folder_path = f"{temp_directory}/{stl_uuid}"
        os.mkdir(folder_path)

        # Save scad files
        scad_paths = settings["scad_path"].split(";")
        new_scad_paths = []
        for path in scad_paths:
            if (path != "Select design file...") and (path != ""):
                path = Path(path)
                new_path = f"{folder_path}/{path.name}"
                shutil.copyfile(path, new_path)
                new_scad_paths.append(new_path)

        # Save stl
        new_stl_path = f"{folder_path}/{stl_path.name}"
        shutil.copyfile(stl_path, new_stl_path)

        # Pack uuid and settings
        stls.append({"uuid": stl_uuid, "settings": settings})

    # Slice stl
    print("**** Slicing STLs... ****")
    processes = []
    for i in range(len(stls)):
        _uuid = stls[i]["uuid"]
        slices_folder = f"{temp_directory}/{_uuid}/slices"
        processes.append(slice_stl(stls[i], slices_folder, slicer_settings))
    for p in processes:
        p.wait()

    # Create secondary images
    for i in range(len(stls)):
        _uuid = stls[i]["uuid"]
        print(f"\n**** Processing {_uuid}... ****")
        slices_folder = Path(f"{temp_directory}/{_uuid}/slices")

        image_paths = []
        for _, image_path in enumerate(slices_folder.iterdir()):
            if image_path.suffix == ".png":
                image_paths.append(image_path)
        image_paths.sort()

        # Create membrane images
        if not membrane_images(stls[i], image_paths, slices_folder):
            shutil.rmtree(temp_directory)
            return False
        # Create edge/roof images
        if not secondary_images(stls[i], image_paths, slices_folder):
            shutil.rmtree(temp_directory)
            return False

    # Create print file
    print("\n**** Generating JSON... ****")
    if not create_file(
        main_settings["output_path"],
        stls,
        temp_directory,
        design_settings=design_settings,
        stitched_images=False,
        stitched_info=None,
        minimal_file=True,
        slicer_settings=slicer_settings,
        zip_output=main_settings["zip_output"],
        progress=progress_handle,
    ):
        shutil.rmtree(temp_directory)
        return False

    shutil.rmtree(temp_directory)
    return True