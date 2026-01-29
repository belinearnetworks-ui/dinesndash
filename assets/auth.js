let StoreTimes=[];
let Allergies=[];
let socket=io();

socket.on("no user found",(data)=>{
    alert("No user with that email was found")
})

document.querySelectorAll('.tab-trigger').forEach(trigger => {
    trigger.addEventListener('click', function() {
        const tab = this.dataset.tab;
        console.log("tab switch triggered")
        // Update tab triggers
        document.querySelectorAll('.tab-trigger').forEach(trigger => {
            trigger.classList.remove('active');
        });
    
        document.querySelector('[data-tab="' + tab + '"]').classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.getElementById(tab).classList.add('active');
    });
});

document.querySelectorAll("input[name='signupUserType']").forEach(input=>{
    input.addEventListener("change",()=>{
        if(input.value==="customer"){
            document.getElementById("UserSignupForm").style.display="block";
            document.getElementById("store-signup-form").style.display="none";
        }else if(input.value==="shop"){
            document.getElementById("UserSignupForm").style.display="none";
            document.getElementById("store-signup-form").style.display="block";
        }
    })
})

function handleLogin(e) {
    e.preventDefault();


    let ProcessingCode="109283651432930948";
    
    let form=document.getElementById("");
    let FormData=new FormData(form);

    fetch(`https://localhost:4000/signin?type=store&processCode=${ProcessingCode}`,{
        method:"post",
        body:FormData
    }).then(res=>res.json()).then(data=>console.log(data)).catch(err=>{
        if(err) throw err;
    })


}

document.getElementById("store_confirm_password").addEventListener("input",()=>{
    let PasswordOne=document.getElementById("store_confirm_password").value.trim();
    let PasswordTwo=document.getElementById("store_signup_password").value.trim();
    if(PasswordTwo!=="" && PasswordOne!==PasswordTwo){
        document.querySelectorAll(".btn-primary")[2].disabled=true;
        document.getElementById("warningtwo").innerHTML="Passwords do not match";
        document.getElementById("Add-Btn").disabled = true; // reset in case it was disabled
        document.getElementById("warningtwo").style.color="red";

    }else if(PasswordTwo!=="" && PasswordOne==PasswordTwo){
        document.querySelectorAll(".btn-primary")[2].disabled=false;
        document.getElementById("warningtwo").innerHTML="Passwords match";
        document.getElementById("warningtwo").style.color="green";
        document.getElementById("Add-Btn").disabled = false; // reset in case it was disabled
    }
})

document.getElementById("UserConfirmPassword").addEventListener("input",()=>{
    let PasswordOne=document.getElementById("UserConfirmPassword").value.trim();
    let PasswordTwo=document.getElementById("UserSignUpPassword").value.trim();
    if(PasswordTwo!=="" && PasswordOne!==PasswordTwo){
        document.getElementById("warningone").innerHTML="Passwords do not match";
        document.getElementById("warningone").style.color="red";
    }else if(PasswordTwo!=="" && PasswordOne==PasswordTwo){
        document.getElementById("warningone").innerHTML="Passwords match";
        document.getElementById("warningone").style.color="green";
    }
})


document.getElementById("ClosingTime").addEventListener("change",()=>{
    if(document.getElementById("ClosingTime").value!==''){
        document.getElementById("closed").disabled=true;
        document.getElementById("closed").checked = false;
    }else if(document.getElementById("ClosingTime").value===''){
        document.getElementById("closed").disabled=false;
    }
})

document.getElementById("allergy").addEventListener("input",()=>{
    console.log("Allergy event listener triggered",document.getElementById("allergy").value)
    if(document.getElementById("allergy").value.toLowerCase()=="none"||document.getElementById("allergy").value.trim()==""){
        document.getElementById("AddAllergy").disabled=true;
    }else{
        document.getElementById("AddAllergy").disabled=false;   
    }
})

document.getElementById("AddAllergy").addEventListener("click",e=>{
    e.preventDefault();
    console.log("Button clicked")

    let Allergy=document.getElementById("allergy");

    if(Allergy.value.trim()!=="none"&&Allergy.value.trim()!==""&&!Allergies.includes(Allergy.value)){
        Allergies.push(Allergy.value.trim());
        let Element=document.createElement("li");
        Element.textContent=Allergy.value;
        document.getElementById("allergies").appendChild(Element);
        Allergy.value=""
    }
})

function AddTime(e) {
    e.preventDefault();

    let DayName = document.getElementById("dayType").value;
    let ClosingTime = document.getElementById("ClosingTime").value;
    let OpeningTime = document.getElementById("OpeningTime").value;
    let closed = document.getElementById("closed").checked;

    document.getElementById("Add-Btn").disabled = false; // reset in case it was disabled

    if (DayName !== "" && ((ClosingTime !== "" && OpeningTime !== "") || closed)) {
        document.getElementById(`${DayName}`).disabled = true;

        let Element = document.createElement("li");

        if (closed) {
            Element.textContent = `${DayName}: Closed`;
            StoreTimes.push({ Days: DayName, Trading: "Closed" });
        } else {
            Element.textContent = `${DayName}: ${OpeningTime} - ${ClosingTime}`;
            StoreTimes.push({ Days: DayName, Trading: "Opened", opening: OpeningTime, closing: ClosingTime });
        }

        document.getElementById("TimesList").appendChild(Element);
        console.log(StoreTimes)
        // reset form inputs
        document.getElementById("OpeningTime").value = "";
        document.getElementById("ClosingTime").value = "";
        document.getElementById("closed").checked = false;
        document.getElementById("closed").disabled= false;


    } else {
        document.getElementById("StoreTimesError").innerHTML="Please make sure all fields are filled"
    }
}

let Thelocation=[];

navigator.geolocation.getCurrentPosition(position=>{
    console.log(position.coords.latitude);
    console.log(position.coords.longitude);
    let UserLocation={
        lat:position.coords.latitude,
        lng:position.coords.longitude
    }
    Thelocation.push(UserLocation)
})

console.log("You are here: ",Thelocation)

document.querySelectorAll(".btn-primary").forEach(button=>{
    button.addEventListener("click",e=>{
        e.preventDefault()
        document.getElementById("loading").style.display="block";
    
        console.log("Button clicked")
        let type=button.getAttribute("usertype");
    
        let ProcessingCode="109283651432930948";
    
        console.log(`Type: ${type}`)
        if(type==="store"){
            console.log("The signing in person is: ",type)
            let SignUpForm=document.getElementById("store-signup-form");
            let formData=new FormData(SignUpForm);
            formData.append("StoreTimes",JSON.stringify(StoreTimes));
            console.log(StoreTimes.length);
            console.log("StoreTimes",StoreTimes)

            if(SignUpForm.store_name==""||StoreTimes.length<4 ||SignUpForm.store_signup_password==""||SignUpForm.store_signup_email==""){
                alert("error")
                if(StoreTimes.length<4){
                    document.getElementById("StoreTimesError").innerHTML=`Store times not fully filled. ${4-StoreTimes.length} remaining`
                }else{
                    document.getElementById("StoreTimesError").innerHTML=``
                }

                document.getElementById("error").innerHTML="Form Not fully filled";
                window.location="#error";
                return;
            }

            if(document.getElementById("store_confirm_password").value.trim()!==document.getElementById("store_signup_password").value.trim()|| document.getElementById("store_signup_password").value.trim()===""||document.getElementById("store_confirm_password").value.trim()===""){
                alert("Password Error")
                document.getElementById("warningtwo").style.color="red";
                document.getElementById("warningtwo").innerHTML="Either Passwords do not match or have not been filled";
                return 
            }

            fetch(`/signup/api/auth/${type}/${ProcessingCode}`,{
                method:"POST",
                body:formData
            }).then(response=>response.json()).then(data=>{
                console.log("data",data);
                console.log("status",data.Status);
                if(data.Status){
                    window.location.reload();
                    // alert("Email to confirm password has been sent")
                }else{
                    document.getElementById("loading").style.display="none";
                    document.getElementById("error").innerHTML=data.Reason;
                    window.location="#error";

                }
            }).catch(err=>{
                if(err) throw err;
            })
        }else if(type==="user"){
            console.log("The signing in person is: ",type)
            let SignUpForm=document.getElementById("UserSignupForm");
            let Data=new FormData(SignUpForm);
            Data.append("Allergies",Allergies)
            
            if(SignUpForm.user_signup_name==""||SignUpForm.UserSignupEmail==""||SignUpForm.UserSignUpPassword==""){
                document.getElementById("error").innerHTML="Form Not fully filled";
                window.location="#error";
                return;      
            }

            if(SignUpForm.UserSignUpPassword.value.trim()==""||SignUpForm.UserSignUpPassword.value.trim()!==SignUpForm.UserConfirmPassword.value.trim()||SignUpForm.UserConfirmPassword.value.trim()==""){
                return document.getElementById("warningone").innerHTML="Either Passwords do not match or have not been filled";
            }

            for (let [key, value] of Data.entries()) {
                console.log(key, value);
            }
            
        
            fetch(`/signup/api/auth/${type}/${ProcessingCode}`,{
                method:"POST",
                body:Data
            }).then(response=>response.json()).then(data=>{
                if(data.Status){
                    console.log("EVerything is fine")
                    window.location.reload();
                    // alert("Email to confirm password has been sent")
                }else{
                    document.getElementById("loading").style.display="none";
                    document.getElementById("error").innerHTML=data.Reason;
                    window.location="#error";
                }
            }).catch(err=>{
                if(err) throw err;
            })
        }
    })
})