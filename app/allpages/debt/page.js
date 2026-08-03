"use client"

import React, { useState, useEffect, useMemo } from "react";
import { ref, update, push, remove, onValue } from 'firebase/database';
import { db } from "../../../config";
import { MdEmail } from "react-icons/md"
import { useUserAccountName, useUserID } from "@/app/componets/zustand/profile";
import { useUserEmployee } from "@/app/componets/zustand/employees";
import { useUserTicket, useUserTicketData, useUserTicketTotal } from "@/app/componets/zustand/ticket";
import { useUserTheme } from "@/app/componets/zustand/theme";
import { FaExclamationCircle, FaTicketAlt, FaUsers } from "react-icons/fa";
import { TiTick } from "react-icons/ti";
import { QRCodeSVG } from 'qrcode.react';
import { TbXboxX } from "react-icons/tb";
import { useUserCart, useUserCartData, useUserCartTotal } from "@/app/componets/zustand/cart";
import { FaCashRegister } from "react-icons/fa";
import { useUserEmail, useUserName, useUserPhone } from "@/app/componets/zustand/profile";
import { useUserCustomers } from "@/app/componets/zustand/customers";



const Debt = () => {


    // Zustand
    const Id = useUserID((state) => state.userID)
    const employees = useUserEmployee((state) => state.userEmployee)


    const bizName = useUserName((state) => state.userName)
    const userAccountName = useUserAccountName((state) => state.userAccountName)


    const bizEmail = useUserEmail((state) => state.userEmail)
    const bizPhone = useUserPhone((state) => state.userPhone)

    const items = useUserTicketData((state) => state.useTicketData)
    //const items = useUserCartData((state) => state.userCartData)

    const ticket = useUserTicket((state) => state.userTicket)
    //const ticket = useUserCart((state) => state.userCart)

    const ticketTotal = useUserTicketTotal((state) => state.userTicketTotal)
    //const ticketTotal = useUserCartTotal((state) => state.userCartTotal)
    const theme = useUserTheme((state) => state.userTheme)

    // ====================== CUSTOMERS (for id -> name resolution) ======================

    const rawCustomers = useUserCustomers((state) => state.userCustomers)

    const customersArray = useMemo(() => {
        if (!rawCustomers) return [];
        if (Array.isArray(rawCustomers)) return rawCustomers;
        return Object.entries(rawCustomers).map(([id, value]) => ({ id, ...value }));
    }, [rawCustomers]);

    // Maps a customer id -> customer name. Anything saved/displayed for a
    // "Customer" from here on should go through this lookup so we only ever
    // carry the name forward, never the raw id.
    const customerNameById = useMemo(() => {
        const map = {};
        customersArray.forEach((c) => {
            map[c.id] = c.Name || "Unnamed Customer";
        });
        return map;
    }, [customersArray]);

    const resolveCustomerName = (customer) => {
        if (!customer) return "-";
        return customerNameById[customer] || customer;
    };

    const [filteredTickets, setFilteredTickets] = useState(null);
    const [cart, setCart] = useState([]);
    const [cart1, setCart1] = useState(null);

    const [selectedCashier, setSelectedCashier] = useState("");

    const [selectedEmployee, setSelectedEmployee] = useState(null);

    //// Filter tickets for the selected employee 
    const handleEmployeeClick = (employeeName) => {
        console.log("employeefun", employeeName)


        setSelectedEmployee(employeeName);
        setCart([])
        setCart1(null)
        setFilteredTickets(null)

        if (ticket) {

            const ticketsForEmployee = ticket.filter((t) => t.EmployeeID === employeeName);
            console.log("employeefun", ticket)

            if (ticketsForEmployee.length == 0) {

                setFilteredTickets(null)
            }
            else {
                setFilteredTickets(ticketsForEmployee);
            }

        } else {
            console.log("there are no tickets")
            setFilteredTickets(null)
        }

    };

    const [receiptNumber, setReceiptNumber] = useState("")

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("");

    const [deleteId, setDeleteId] = useState()

    const handleTicketClick = (id, cartItems, cashier, cashSale, date, customer) => {
        setCart(cartItems);
        setCart1(cartItems);

        // "customer" here is ticket.Customer, which may be the customer's id.
        // Resolve it to a name once, here, so everything downstream (state,
        // UI, and the eventual saved cart record) only ever carries the name.
        setSelectedCustomer(resolveCustomerName(customer));

        setDeleteId(id)

        setSelectedCashier(cashier);
        setReceiptNumber(cashSale);

        const jsDate = new Date(date); // Convert timestamp to JS Date

        // Extract date: dd/mm/yyyy
        const day = String(jsDate.getDate()).padStart(2, "0");
        const month = String(jsDate.getMonth() + 1).padStart(2, "0"); // Months are zero-based
        const year = jsDate.getFullYear();
        const dateOnly = `${day}/${month}/${year}`;

        // Extract time: hh:mm:ss
        const timeOnly = jsDate.toTimeString().split(" ")[0];

        setSelectedDate(dateOnly); // dd/mm/yyyy
        setSelectedTime(timeOnly); // hh:mm:ss
    };


    /// Maintain the total function
    const calculateTotal = (cart) => {
        if (!cart || cart.length === 0) {
            return 0;
        }
        return cart.reduce((sum, item) => sum + (item.stock * item.Price), 0);
    };

    useEffect(() => {
        setTotal(calculateTotal(cart));
    }, [cart]);



    /// General Variables
    const [selectEmployee, setSelectEmployee] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [total, setTotal] = useState(0);


    /// Modals
    const [sendModal, setSendModal] = useState(false);
    const [receiptModal, setReceiptModal] = useState(false);
    const [receiptModal1, setReceiptModal1] = useState(false);

    const receiptModalFun = () => setReceiptModal(false);

    const sendModalFun = () => {
        setSelectEmployee("")
        setSelectedCashier('')
        setSelectedCustomer('')
        setSendModal(false);
    }

    const generateRandomHex = () => {
        const receiptNumber1 = 'MRCS' + Math.floor(100000 + Math.random() * 900000);
        return receiptNumber1;
    };


    /// send to db
    const handleSend = () => {
        if (Id) {
            if (userAccountName) {
                if (total == 0) {
                    console.log("total is zero")
                    sendModalFun()
                    sendFail()
                }
                else {
                    try {

                        const hexTicket = generateRandomHex();
                        const dbRef = ref(db, `web/pos/${Id}/cart/`);
                        const newbranchRef = push(dbRef, {

                            EmployeeID: userAccountName,
                            CashSale: hexTicket,
                            Cart: cart,
                            Customer: selectedCustomer,
                            Total: total,
                            Date: Date.now()

                        });
                        const newCreditKey = newbranchRef.key;

                        sendModalFun()
                        sendSuccess()
                        deleteTicket(userAccountName)
                    }
                    catch {
                        console.log("did not send to DB")
                        sendModalFun()
                        sendFail()
                    }
                }
            }
            else {
                console.log("did not select employee ")
                sendModalFun()
                sendFailEmployee()

            }
        }
    };

    const sendFunction = () => {
        setSendModal(true)
    }

    const deleteTicket = (employee) => {
        if (Id) {

            if (ticketTotal == 1) {

                remove(ref(db, `web/pos/${Id}/ticket`)).then(() => {

                    useUserTicket.setState({ userTicket: null });
                    useUserTicketTotal.setState({ userTicketTotal: null });
                    setDeleteId(null)

                    handleEmployeeClick(employee)

                })
                    .catch((error) => {
                        console.log("ticket was not deleted")
                    });
            } else {
                remove(ref(db, `web/pos/${Id}/ticket/${deleteId}`)).then(() => {
                    console.log("ticket was deleted")
                    setDeleteId(null)
                    hands()
                })
                    .catch((error) => {
                        console.log("ticket was not deleted")
                    });
            }
        }
    }


    const hands = async () => {
        setCart([])
        setCart1(null)

        const posRef = ref(db, `web/pos/${Id}/ticket`);
        onValue(posRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {

                const newPosts = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                setFilteredTickets(newPosts)
            }
        });
    }


    ////  Auto close modals
    const [sendModalSuccess, setSendModalSuccess] = useState(false);
    const [sendModalFail, setSendModalFail] = useState(false);
    const [sendModalFailEmployee, setSendModalFailEmployee] = useState(false);


    const sendSuccess = () => {
        setSendModalSuccess(true);
        setTimeout(() => setSendModalSuccess(false), 1500);
    };


    const sendFail = () => {
        setSendModalFail(true);
        setTimeout(() => setSendModalFail(false), 1500);
    };


    const sendFailEmployee = () => {
        setSendModalFailEmployee(true);
        setTimeout(() => setSendModalFailEmployee(false), 1500);
    };

    ///////////////////////////////////////////////////////////////////////////////////////////

    const totalItems = cart.length;
    const totalQty = cart.reduce((sum, item) => sum + parseInt(item.stock), 0);
    const totalWeight = cart.reduce((sum, item) => sum + (parseFloat(item.Weight || 0) * parseInt(item.stock)), 0);

    // VAT Breakdown logic
    const vatBreakdown = {
        A: { vatable: 0, vat: 0 },
        E: { vatable: 0, vat: 0 },
        Z: { vatable: 0, vat: 0 }
    };

    cart.forEach(item => {
        const code = item.vatCode || 'A'; // Default to 'A' if not provided
        const qty = parseInt(item.stock);
        const price = parseFloat(item.Price);
        const vatableAmount = price * qty;
        const vatAmount = code === 'A' ? vatableAmount * 0.16 : 0; // 16% VAT for code A

        if (vatBreakdown[code]) {
            vatBreakdown[code].vatable += vatableAmount;
            vatBreakdown[code].vat += vatAmount;
        }
    });

    const format = (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });


    return (

        <div className={`min-h-screen flex flex-col 
                  ${theme === "Dark"
                ? "text-white "
                : "bg-gray-200 text-black rounded-lg"
            }`}>

            {/* Main Layout */}
            {!receiptModal && (
                <div
                    className={`flex flex-col lg:flex-row flex-grow p-1 md:w-3/4 w-full mx-auto ${theme === "Dark" ? "text-white" : "bg-gray-100 text-black rounded-lg"
                        }`}
                >
                    {/* LEFT COLUMN: Employees + Receipts Stacked */}
                    <aside className="border-r  sm:w-1/3 shadow-xl rounded-lg h-screen sm:h-screen flex flex-col overflow-hidden">

                        {/* EMPLOYEES SECTION (TOP) */}
                        <div className="p-6 flex flex-col border-b">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm sm:text-lg font-bold">Employees</h3>
                            </div>

                            <div className="flex-1 overflow-x-auto py-2 px-2">
                                <div className="flex space-x-3">
                                    {employees && employees.length ? (
                                        employees.map((employee, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleEmployeeClick(employee.Name)}
                                                className={`flex-shrink-0 flex items-center justify-center px-4 py-2 rounded-lg shadow transition-all duration-200

  ${selectedEmployee === employee.Name
                                                        ? theme === "Dark"
                                                            ? "bg-blue-700 text-white ring-2 ring-blue-400"
                                                            : "bg-blue-600 text-white ring-2 ring-blue-300"
                                                        : theme === "Dark"
                                                            ? "bg-gray-800 text-white hover:bg-blue-800"
                                                            : "bg-white text-gray-800 hover:bg-blue-200"
                                                    }
  `}
                                            >
                                                <p className="font-semibold text-sm">{employee.Name}</p>
                                            </button>

                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 w-full overflow-hidden animate-in fade-in duration-700">

                                            {/* --- Animation Container --- */}
                                            <div className="relative mb-10 group">

                                                {/* Soft Ambient "Breathing" Glow (Rhythm) */}
                                                <div className={`absolute inset-0 scale-150 blur-[50px] rounded-full opacity-20 animate-[pulse_4s_ease-in-out_infinite]
            ${theme === "Dark" ? "bg-blue-400" : "bg-blue-600"}`}></div>

                                                {/* Floating Icon with a subtle wiggle on hover */}
                                                <div className="relative z-10 animate-[float_3s_ease-in-out_infinite] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                                                    <FaUsers
                                                        className={`text-7xl ${theme === "Dark" ? "text-white" : "text-blue-700"}`}
                                                    />

                                                    {/* Minimalist Accent (Pulsing Dot) */}
                                                    <div className="absolute -bottom-2 -right-2">
                                                        <div className={`w-4 h-4 rounded-full animate-ping ${theme === "Dark" ? "bg-blue-300" : "bg-blue-500"}`}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* --- Text Section with Staggered Reveal --- */}
                                            <div className="text-center px-4 space-y-4">

                                                {/* EXACT Wording, modernized styling */}
                                                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight opacity-0 animate-[fadeInSlide_0.8s_ease-out_forwards]
            ${theme === "Dark" ? "text-white" : "text-gray-900"}`}>
                                                    No Employee Added
                                                </h1>

                                                {/* Expanding Decorative Line */}
                                                <div className={`h-[3px] w-0 mx-auto bg-blue-500 animate-[growLine_1s_ease-in-out_0.5s_forwards]`}></div>

                                                {/* Optional Context Slogan (Matching the modern vibe) */}
                                                <p className={`text-md font-medium max-w-xs mx-auto opacity-0 animate-[fadeInSlide_0.8s_ease-out_0.8s_forwards]
            ${theme === "Dark" ? "text-gray-400" : "text-gray-500"}`}>
                                                    Your staff registry is empty. Add your first team member to begin.
                                                </p>
                                            </div>

                                            {/* --- Custom Animation Keyframes --- */}
                                            <style jsx>{`
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        @keyframes fadeInSlide {
            from { opacity: 0; transform: translateY(15px); filter: blur(5px); }
            to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes growLine {
            from { width: 0; }
            to { width: 80px; }
        }
    `}</style>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RECEIPT SECTION (BOTTOM) */}
                        <div className="p-6 flex flex-col flex-1 overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm sm:text-lg font-bold">Receipt Names</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2">
                                {filteredTickets && filteredTickets.length ? (
                                    [...filteredTickets]
                                        .sort((a, b) => b.Date - a.Date)
                                        .map((ticket, index) => (
                                            <button
                                                key={index}
                                                style={{ borderRadius: 5 }}
                                                onClick={() =>
                                                    handleTicketClick(
                                                        ticket.id,
                                                        ticket.Cart,
                                                        ticket.EmployeeID,
                                                        ticket.CashSale,
                                                        ticket.Date,
                                                        ticket.Customer
                                                    )
                                                }
                                                className={`flex flex-row justify-between items-center p-2 rounded shadow-sm ${theme === "Dark"
                                                    ? "border border-blue-800"
                                                    : "bg-white hover:bg-blue-200"
                                                    }`}
                                            >
                                                <p className="text-xs sm:text-sm text-left">
                                                    {resolveCustomerName(ticket.Customer)} <br />
                                                    <span className="opacity-60">
                                                        {new Date(ticket.Date).toLocaleString("en-GB")}
                                                    </span>
                                                </p>

                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setReceiptModal(true);
                                                    }}
                                                    className={`py-1 px-3 rounded text-xs ${theme === "Dark"
                                                        ? "text-white bg-blue-800 hover:bg-blue-600"
                                                        : "bg-blue-600 text-white hover:bg-blue-800"
                                                        }`}
                                                >
                                                    Receipt
                                                </div>
                                            </button>
                                        ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 w-full overflow-hidden animate-in fade-in duration-1000">

                                        {/* --- Animation Container --- */}
                                        <div className="relative mb-10">

                                            {/* The "Orbit" Ring - a subtle rotating border that feels like "Scanning/Waiting" */}
                                            <div className={`absolute inset-0 -m-4 rounded-full border-2 border-dashed opacity-20 animate-[spin_8s_linear_infinite]
            ${theme === "Dark" ? "border-blue-400" : "border-blue-600"}`}></div>

                                            {/* Deep Ambient Glow */}
                                            <div className={`absolute inset-0 scale-125 blur-[45px] rounded-full opacity-10 animate-pulse
            ${theme === "Dark" ? "bg-indigo-400" : "bg-blue-600"}`}></div>

                                            {/* Main Icon - Soft Breathing Animation */}
                                            <div className="relative z-10 animate-[softBreath_4s_ease-in-out_infinite]">
                                                <FaExclamationCircle
                                                    className={`text-6xl ${theme === "Dark" ? "text-white" : "text-blue-700"}`}
                                                />

                                                {/* Minimalist Status Indicator */}
                                                <div className="absolute top-0 right-0">
                                                    <div className={`w-3 h-3 rounded-full ${theme === "Dark" ? "bg-blue-400" : "bg-blue-500"} shadow-lg shadow-blue-500/50`}></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- Text Section --- */}
                                        <div className="text-center px-6">

                                            {/* Your Exact Wording */}
                                            <h1 className={`text-xl sm:text-2xl font-black tracking-tight opacity-0 animate-[fadeInSlide_0.8s_ease-out_forwards]
            ${theme === "Dark" ? "text-white" : "text-gray-900"}`}>
                                                Select Employee / No Debts
                                            </h1>

                                            {/* Rhythm Divider */}
                                            <div className={`h-[3px] w-0 mx-auto my-4 bg-blue-500 animate-[growLine_1s_ease-in-out_0.5s_forwards]`}></div>

                                            <p className={`text-xs uppercase tracking-[0.2em] font-bold opacity-0 animate-[fadeInSlide_0.8s_ease-out_0.8s_forwards]
            ${theme === "Dark" ? "text-gray-500" : "text-gray-400"}`}>
                                                Awaiting selection to display records
                                            </p>
                                        </div>

                                        {/* --- Custom Rhythm Keyframes --- */}
                                        <style jsx>{`
        @keyframes softBreath {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes fadeInSlide {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes growLine {
            from { width: 0; }
            to { width: 50px; }
        }
    `}</style>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* RIGHT COLUMN: Items Section */}
                    <section className="w-full p-6 h-screen flex flex-col overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-md sm:text-lg font-bold">Items Breakdown</h3>
                            <div
                                className={`font-bold text-md sm:text-lg ${theme === "Dark" ? "text-white" : "text-black"
                                    }`}
                            >
                                Total: Ksh {total.toFixed(2)}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <table className="min-w-full table-auto shadow-lg rounded overflow-hidden">
                                <thead
                                    className={`sticky top-0 ${theme === "Dark" ? "bg-blue-800" : "bg-blue-600 text-white"
                                        }`}
                                >
                                    <tr>
                                        <th className={`border py-2 text-xs sm:text-md ${theme === "Dark" ? "border-blue-900" : "border-gray-300"}`}>#</th>
                                        <th className={`border py-2 text-xs sm:text-md ${theme === "Dark" ? "border-blue-900" : "border-gray-300"}`}>Item</th>
                                        <th className={`border py-2 text-xs sm:text-md ${theme === "Dark" ? "border-blue-900" : "border-gray-300"}`}>Unit</th>
                                        <th className={`border py-2 text-xs sm:text-md ${theme === "Dark" ? "border-blue-900" : "border-gray-300"}`}>Price</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {cart &&
                                        cart
                                            .filter((item) =>
                                                item.Name.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((item, index) => (
                                                <tr
                                                    key={item.id}
                                                    className={`text-xs sm:text-sm ${theme === "Dark"
                                                        ? "hover:bg-blue-900/40"
                                                        : "bg-white border border-gray-300 hover:bg-blue-100"
                                                        }`}
                                                >
                                                    <td className={`px-4 py-2 text-center border ${theme === "Dark" ? "border-blue-800" : "border-gray-300"}`}>
                                                        {index + 1}
                                                    </td>
                                                    <td className={`px-4 py-2 text-center border ${theme === "Dark" ? "border-blue-800" : "border-gray-300"}`}>
                                                        {item.Name}
                                                    </td>
                                                    <td className={`px-4 py-2 text-center border ${theme === "Dark" ? "border-blue-800" : "border-gray-300"}`}>
                                                        {item.stock}
                                                    </td>
                                                    <td className={`px-4 py-2 text-center border ${theme === "Dark" ? "border-blue-800" : "border-gray-300"}`}>
                                                        {item.Price}
                                                    </td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>

                        {cart1 && (
                            <div className="flex justify-end mt-4">
                                <button
                                    className={`py-2 px-7 rounded-lg text-xs sm:text-base ${theme === "Dark"
                                        ? "text-white bg-green-800 hover:bg-green-600"
                                        : "bg-green-600 text-white hover:bg-green-800 shadow-lg"
                                        }`}
                                    onClick={() => sendFunction()}
                                >
                                    Clear Debt
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}


            {/*receipt Modal */}
            {receiptModal1 && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80">
                    <div className="bg-white p-6 rounded shadow w-96" >
                        <h2 className="text-lg font-bold mb-4">Print Receipt</h2>

                        {cart.map((item, index) => (
                            <div
                                key={index}
                                className=" flex justify-between items-center p-2 bg-white shadow rounded mb-2 text-sm mt-3"
                            >
                                <div className="w-1/10 text-center">{item.stock}</div>
                                <div className="w-2/5 text-center">{item.Name}</div>
                                <div className="w-1/5 text-center">Ksh {item.Price}</div>

                            </div>
                        ))}


                        <div className="mt-4 font-bold text-lg">
                            Total: Ksh {total.toFixed(2)}

                        </div>

                        <div className=" flex flex-row justify-evenly">
                            <button
                                className={` text-white px-4 py-2 rounded  mt-4 
                                
                              ${theme === "Dark"
                                        ? "bg-green-800  hover:bg-green-600"
                                        : "bg-green-600  hover:bg-green-800 "
                                    }`}
                                onClick={() => window.print()}
                            >
                                print
                            </button>
                            <button
                                className={` text-white px-4 py-2 rounded mt-4
                                  ${theme === "Dark"
                                        ? "bg-red-800  hover:bg-red-600"
                                        : "bg-red-600  hover:bg-red-800 "
                                    }`}
                                onClick={receiptModalFun}
                            >
                                Cancel
                            </button>

                        </div>
                    </div>
                </div>
            )}

            {receiptModal && (
                <div className="w-full flex items-center justify-center bg-black bg-opacity-10 overflow-y-auto">

                    <div
                        className={`p-4  shadow w-[380px] font-sans text-sm  print-area receipt-container
                 ${theme === "Dark" ? "bg-white text-black" : "bg-white text-black"}
               `}
                    >
                        <div className="text-center ">
                            <p className=" font-bold text-xl font-extrabold tracking-tight uppercase font-sans">
                                {bizName}
                            </p>
                            <p className="font-semibold text-sm">Email : {bizEmail}</p>
                            <p className="font-semibold text-md">TEL : {bizPhone} </p>
                            {/**
                        *  <p className="font-semibold text-xs">VAT #: A002691181T | PIN  #: A002691181T</p>
                        */}

                        </div>

                        {/* Paybill Section with background 
                      <div className="print-bg bg-black text-white text-4xl py-1 text-center font-bold">
                       PAYBILL: 157424
                     </div>
                     */}


                        <div className="border-t border-dotted border-black/20 mt-1"></div>

                        {/* Cash Sale Header */}

                        <div className="text-center font-bold text-lg mb-2">CASH SALE</div>
                        <div className="border-t border-dotted border-black/20"></div>
                        <div className="flex justify-between mb-2 font-bold">
                            <div>
                                {/**<p className="text-sm  ">Till No: {selectedTill}</p>
                          * 
                          *   <p className="text-sm ">PIN:</p>
                          */}
                                <p className="text-sm ">M/S: {selectedCashier}</p>

                            </div>
                            <div>
                                <p className="text-sm">Cash Sale #: {receiptNumber}</p>
                            </div>

                        </div>


                        <div className="flex justify-between mb-2">
                            <p className="text-sm">Date: {selectedDate}</p>
                            <p className="text-sm ">Time:<span className="text-sm mx-2"> {selectedTime}</span></p>
                        </div>
                        <div className="border-t border-dotted border-black/20"></div>
                        <div >
                            <div className="flex justify-between font-bold text-sm">
                                <div className="w-1/2">ITEM</div>
                                <div className="grid grid-cols-2 gap-4 w-40 text-right">
                                    <span>PRICE</span>
                                    <span>AMOUNT</span>
                                </div>
                            </div>
                            <div className="border-t border-dotted border-black/20"></div>

                            <div className="bg-white text-black">
                                {cart.map((item, i) => (
                                    <div key={i} className="py-1">
                                        <div className="flex justify-between font-bold">
                                            <div className="font-sm">{item.Name}</div>
                                            <div className="text-xs">A</div>
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="text-xs" >

                                                <span className="ml-8 text-sm ">
                                                    Qty : {parseFloat(item.stock).toFixed(0)}
                                                </span>
                                            </div>
                                            <div >
                                                <div className="grid grid-cols-2 gap-4 w-40 text-right">

                                                    <span>{item.Price.toLocaleString()}</span>
                                                    <span>{(parseInt(item.stock) * parseInt(item.Price)).toLocaleString()}</span>

                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t border-dotted border-black/20"></div>
                                    </div>

                                ))}
                            </div>


                            <div className="border-t border-dotted border-black/20"></div>


                            <div className=" my-2" />
                            <div className="flex justify-between font-bold text-lg">
                                <span>TOTAL:</span>
                                <span>{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>CASH:</span>
                                <span>{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>CHANGE:</span>
                                <span>0.00</span>
                            </div>
                        </div>
                        <div className="border-t border-dotted border-black/20"></div>

                        {/* Footer Summary */}
                        <div className="text-xs space-y-1">
                            <p className="flex items-center font-bold">
                                <strong className="flex-1">TOTAL ITEMS:</strong>
                                <span className="text-center w-40 mr-7">{totalItems}</span>
                            </p>
                            <div className="border-t border-dotted border-black/20"></div>
                            <p className="flex items-center font-bold">
                                <strong className="flex-1">TOTAL QTY:</strong>
                                <span className="text-center w-40 mr-7">{totalQty}</span>
                            </p>
                            <div className="border-t border-dotted border-black/20"></div>
                            <p className="flex items-center font-bold">

                                <span className="text-center w-40 mr-7">{format(totalWeight)}</span>
                            </p>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="border-t border-dotted border-black/20"></div>

                            {/* VAT Breakdown */}
                            <div className="mt-2">
                                <div className="grid grid-cols-4 text-xs mr-6">
                                    <p className="col-span-1 underline text-left"><strong>CODE</strong></p>
                                    <p className="col-span-1 underline text-right"><strong>VATABLE AMT</strong></p>
                                    <p className="col-span-1 underline text-right"><strong>VAT AMT</strong></p>
                                    <p className="col-span-1 underline text-right"><strong>TOTAL</strong></p>

                                    {['A', 'E', 'Z'].map(code => (
                                        <React.Fragment key={code}>
                                            <p className="col-span-1 text-left font-bold">{code}</p>
                                            <p className="col-span-1 text-right font-bold">{format(vatBreakdown[code].vatable - vatBreakdown[code].vat)}</p>
                                            <p className="col-span-1 text-right font-bold">{format(vatBreakdown[code].vat)}</p>
                                            <p className="col-span-1 text-right font-bold">
                                                {format(vatBreakdown[code].vatable)}
                                            </p>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-dotted border-black/20"></div>
                            <p className="mt-2 font-semibold">VAT CODE:(A)=VATABLE, (E)=EXEMPT, (Z)=ZERO RATED</p>
                            <p className="font-semibold">PRICES INCLUSIVE OF VAT WHERE APPLICABLE</p>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="border-t border-dotted border-black/20"></div>
                            <p className="font-bold">YOU WERE SERVED BY : {selectedCashier}</p>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="text-xm text-center font-bold">
                                <p>GOODS ONCE SOLD CANNOT BE ACCEPTED</p>
                                <p>BACK FOR REFUND OR ANY OTHER REASON</p>
                            </div>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="border-t border-dotted border-black/20"></div>
                            <div className="border-t border-dotted border-black/20"></div>

                            {/* QR Code Placeholder */}
                            <div className="flex justify-center my-3">
                                <QRCodeSVG
                                    value={JSON.stringify({
                                        invoice: '011039102000356913',
                                        totalItems: totalItems,
                                        totalQty: totalQty,
                                        totalWeight: totalWeight.toFixed(2),
                                        totalVAT: vatBreakdown.A.vat.toFixed(2),
                                        totalAmount: (vatBreakdown.A.vatable + vatBreakdown.A.vat).toFixed(2),
                                    })}
                                    size={96}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="H"
                                    className="border border-gray-400"
                                />
                            </div>

                            <div className="border-t border-black mb-2"></div>

                        </div>

                        <div className="text-xs text-center font-semibold">
                            <p >Thank You......Come Again.</p>
                        </div>

                        <div className=" no-print flex flex-row justify-evenly mt-4">
                            <button
                                className={`text-white px-4 py-2 rounded 
                     ${theme === "Dark" ? "bg-green-800 hover:bg-green-600" : "bg-green-600 hover:bg-green-800"}`}
                                onClick={() => window.print()}
                            >
                                Print
                            </button>
                            <button
                                className={`text-white px-4 py-2 rounded 
                     ${theme === "Dark" ? "bg-red-800 hover:bg-red-600" : "bg-red-600 hover:bg-red-800"}`}
                                onClick={receiptModalFun}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* send Modal */}
            {sendModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80">
                    <div className={` p-6 rounded-xl shadow w-96  mx-4
                        ${theme === "Dark"
                            ? " bg-[#171941] "
                            : " bg-white "
                        }`
                    }>
                        <h2 className="text-md sm:text-lg font-bold mb-4 text-center">Confirm Sell </h2>

                        <div className="mt-4 font-bold text-md sm:text-lg">
                            Total: Ksh{total.toFixed(2)}
                        </div>
                        <div className="mt-4">
                            <div className="mt-4  font-bold text-sm sm:text-lg">
                                Cleared by {userAccountName}
                            </div>
                        </div>

                        <div className=" flex flex-row justify-evenly">
                            <button
                                className={` text-white px-5 py-2 rounded  mt-4  text-xs sm:text-base
                                
                              ${theme === "Dark"
                                        ? "bg-green-800  hover:bg-green-600"
                                        : "bg-green-600  hover:bg-green-800 "
                                    }`}
                                onClick={handleSend}
                            >
                                Sell
                            </button>
                            <button
                                className={` text-white px-4 py-2 rounded mt-4 text-xs sm:text-base
                                  ${theme === "Dark"
                                        ? "bg-red-800  hover:bg-red-600"
                                        : "bg-red-600  hover:bg-red-800 "
                                    }`}
                                onClick={sendModalFun}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Auto-Close Modals */}
            {sendModalSuccess && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80">
                    <div className={` p-6 rounded-xl 
                    
                     ${theme === "Dark"
                            ? " bg-[#171941] "
                            : " bg-white shadow-lg "
                        }`}>
                        <div className='flex justify-center'>

                            <TiTick className='text-green-600 text-4xl  ' />
                            <h2 className="text-lg font-bold mb-4">Success</h2>
                        </div>
                        <p>The Debt was cleared</p>
                    </div>
                </div>
            )}

            {sendModalFail && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80">
                    <div className={` p-6 rounded-xl 
                    
                     ${theme === "Dark"
                            ? " bg-[#171941] "
                            : " bg-white shadow-lg "
                        }`}>
                        <div className='flex justify-center'>
                            <TbXboxX className='text-red-600 text-3xl   ' />
                            <h2 className="text-lg font-bold mb-4 mx-1">Failed</h2>
                        </div>
                        <p>The Debt was not cleared</p>
                    </div>
                </div>
            )}

            {sendModalFailEmployee && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80">
                    <div className={` p-6 rounded-xl 
                    
                     ${theme === "Dark"
                            ? " bg-[#171941] "
                            : " bg-white shadow-lg "
                        }`}>
                        <div className='flex justify-center'>
                            <TbXboxX className='text-red-600 text-3xl   ' />
                            <h2 className="text-lg font-bold mb-4 mx-1">Failed</h2>
                        </div>
                        <p>Did not choose an Employee</p>
                    </div>
                </div>
            )}

        </div>
    )


}

export default Debt
