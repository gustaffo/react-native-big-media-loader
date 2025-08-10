cmake_minimum_required(VERSION 3.13)

# Define the library name
set(LIBRARY_NAME bigmedialoader)

# Create the library
add_library(${LIBRARY_NAME} SHARED
    # Add your C++ source files here when implementing JSI
    # src/main/cpp/BigMediaLoaderJSI.cpp
)

# Include directories
target_include_directories(${LIBRARY_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src/main/cpp
    ${NODE_MODULES_DIR}/react-native/ReactCommon
    ${NODE_MODULES_DIR}/react-native/ReactCommon/callinvoker
    ${NODE_MODULES_DIR}/react-native/ReactCommon/jsi
)

# Link libraries
target_link_libraries(${LIBRARY_NAME}
    android
    log
    fbjni
    jsi
    react_nativemodule_core
)

# Set C++ standard
set_target_properties(${LIBRARY_NAME} PROPERTIES
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED YES
)
