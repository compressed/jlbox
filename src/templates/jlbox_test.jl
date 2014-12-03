module JLBOX_MODULETest
include("$(pwd())/test/helper.jl")
reload("$(pwd())/src/JLBOX_MODULE.jl")
using JLBOX_MODULE

facts("JLBOX_MODULE") do
    @fact isempty(lintfile("$(pwd())/src/JLBOX_MODULE.jl", returnMsgs=true)) => true
    @fact isempty(lintfile("$(pwd())/test/JLBOX_MODULE_test.jl", returnMsgs=true)) => true
end

end # module JLBOX_MODULETest
