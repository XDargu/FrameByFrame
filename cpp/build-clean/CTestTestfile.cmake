# CMake generated Testfile for 
# Source directory: C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp
# Build directory: C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/build-clean
# 
# This file includes the relevant testing commands required for 
# testing this directory and lists subdirectories to be tested as well.
if(CTEST_CONFIGURATION_TYPE MATCHES "^([Dd][Ee][Bb][Uu][Gg])$")
  add_test([=[fbf_raw_converter_tests]=] "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/build-clean/Debug/fbf_raw_converter_tests.exe")
  set_tests_properties([=[fbf_raw_converter_tests]=] PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;62;add_test;C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;0;")
elseif(CTEST_CONFIGURATION_TYPE MATCHES "^([Rr][Ee][Ll][Ee][Aa][Ss][Ee])$")
  add_test([=[fbf_raw_converter_tests]=] "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/build-clean/Release/fbf_raw_converter_tests.exe")
  set_tests_properties([=[fbf_raw_converter_tests]=] PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;62;add_test;C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;0;")
elseif(CTEST_CONFIGURATION_TYPE MATCHES "^([Mm][Ii][Nn][Ss][Ii][Zz][Ee][Rr][Ee][Ll])$")
  add_test([=[fbf_raw_converter_tests]=] "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/build-clean/MinSizeRel/fbf_raw_converter_tests.exe")
  set_tests_properties([=[fbf_raw_converter_tests]=] PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;62;add_test;C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;0;")
elseif(CTEST_CONFIGURATION_TYPE MATCHES "^([Rr][Ee][Ll][Ww][Ii][Tt][Hh][Dd][Ee][Bb][Ii][Nn][Ff][Oo])$")
  add_test([=[fbf_raw_converter_tests]=] "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/build-clean/RelWithDebInfo/fbf_raw_converter_tests.exe")
  set_tests_properties([=[fbf_raw_converter_tests]=] PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;62;add_test;C:/Users/Daniel/Documents/GitHub/FrameByFrame/cpp/CMakeLists.txt;0;")
else()
  add_test([=[fbf_raw_converter_tests]=] NOT_AVAILABLE)
endif()
subdirs("_deps/nlohmann_json-build")
subdirs("_deps/zlib-build")
