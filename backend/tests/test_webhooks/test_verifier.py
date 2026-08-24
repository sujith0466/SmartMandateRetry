"""Cryptographic signature verifier unit tests."""

import pytest
from app.infrastructure.webhook_verifier import RazorpaySignatureVerifier

TEST_SECRET = "whsec_test_secret_key_12345"


def test_signature_verification_success():
    verifier = RazorpaySignatureVerifier(TEST_SECRET)
    raw_body = b'{"event":"payment.failed","account_id":"acc_001"}'
    valid_sig = verifier.compute_signature(raw_body)

    assert verifier.verify(raw_body, valid_sig) is True


def test_signature_verification_tampered_payload():
    verifier = RazorpaySignatureVerifier(TEST_SECRET)
    raw_body = b'{"event":"payment.failed","account_id":"acc_001"}'
    valid_sig = verifier.compute_signature(raw_body)

    tampered_body = b'{"event":"payment.failed","account_id":"acc_002"}'
    assert verifier.verify(tampered_body, valid_sig) is False


def test_signature_verification_wrong_secret():
    verifier_1 = RazorpaySignatureVerifier(TEST_SECRET)
    verifier_2 = RazorpaySignatureVerifier("wrong_secret_key_99999")

    raw_body = b'{"event":"payment.failed"}'
    sig = verifier_1.compute_signature(raw_body)

    assert verifier_2.verify(raw_body, sig) is False


def test_signature_verification_empty_or_none():
    verifier = RazorpaySignatureVerifier(TEST_SECRET)
    raw_body = b'{"event":"payment.failed"}'

    assert verifier.verify(raw_body, None) is False
    assert verifier.verify(raw_body, "") is False


def test_verifier_unconfigured_secret():
    verifier = RazorpaySignatureVerifier("")
    raw_body = b'{"event":"payment.failed"}'

    assert verifier.verify(raw_body, "some_sig") is False
