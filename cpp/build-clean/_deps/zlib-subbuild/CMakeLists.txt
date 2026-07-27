# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.31.0)

# Reject any attempt to use a toolchain file. We must not use one because
# we could be downloading it here. If the CMAKE_TOOLCHAIN_FILE environment
# variable is set, the cache variable will have been initialized from it.
unset(CMAKE_TOOLCHAIN_FILE CACHE)
unset(ENV{CMAKE_TOOLCHAIN_FILE})

# We name the project and the target for the ExternalProject_Add() call
# to something that will highlight to the user what we are working on if
# something goes wrong and an error message is produced.

project(zlib-populate NONE)



include(ExternalProject)
ExternalProject_Add(zlib-populate
                     "UPDATE_DISCONNECTED" "False" "DOWNLOAD_EXTRACT_TIMESTAMP" "TRUE" "EXTERNALPROJECT_INTERNAL_ARGUMENT_SEPARATOR" "URL" "https://github.com/madler/zlib/releases/download/v1.3.1/zlib-1.3.1.tar.xz" "URL_HASH" "SHA256=38ef96b8dfe510d42707d9c781877914792541133e1870841463bfa73f883e32"
                    SOURCE_DIR          "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/build-clean/_deps/zlib-src"
                    BINARY_DIR          "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/build-clean/_deps/zlib-build"
                    CONFIGURE_COMMAND   ""
                    BUILD_COMMAND       ""
                    INSTALL_COMMAND     ""
                    TEST_COMMAND        ""
                    USES_TERMINAL_DOWNLOAD  YES
                    USES_TERMINAL_UPDATE    YES
                    USES_TERMINAL_PATCH     YES
)


