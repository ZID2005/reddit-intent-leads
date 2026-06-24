import unittest
import logging
from unittest.mock import patch, MagicMock
from backend.lead_qualifier import qualify_leads, _is_excluded, _qualify_single, QualifierStats


class TestLeadQualifier(unittest.TestCase):

    def setUp(self):
        QualifierStats.reset()

    def test_negative_exclusions(self):
        # Showcase / I built
        excluded, reason = _is_excluded("I built a new app", "Check out the repo here")
        self.assertTrue(excluded)
        self.assertEqual(reason, "hard_block:title:i built")

        # Just launched
        excluded, reason = _is_excluded("We just launched our SaaS today", "We are excited to share")
        self.assertTrue(excluded)
        self.assertEqual(reason, "hard_block:title:we just launched")

        # Generic poll in title
        excluded, reason = _is_excluded("What is your favorite tool?", "Tell me below")
        self.assertTrue(excluded)
        self.assertEqual(reason, "hard_block:title:what is your favorite")

        # Build in public in body
        excluded, reason = _is_excluded("My thoughts on building", "I am building in public today")
        self.assertTrue(excluded)
        self.assertEqual(reason, "hard_block:body:building in public")

        # Feedback Requests (Audit additions)
        excluded, reason = _is_excluded("Looking for feedback on prelaunch website and product", "")
        self.assertTrue(excluded)
        self.assertEqual(reason, "hard_block:title:looking for feedback")

        excluded, reason = _is_excluded("Some title", "website feedback needed")
        self.assertTrue(excluded)
        self.assertEqual(reason, "hard_block:body:website feedback")


    def test_positive_passes(self):
        # Looking to buy CRM (Even with the word "agency")
        lead = {
            "post_id": "pos_crm",
            "title": "Looking for a CRM tool for a 5-person agency",
            "body": "Hey everyone, our agency is growing and spreadsheets aren't cutting it anymore. We need a CRM under $100/month."
        }
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "looking for")

        # Stripe vs Paddle comparison (must contain problem word now due to tightened vs rule)
        lead = {
            "post_id": "pos_comparison",
            "title": "Stripe vs Paddle for SaaS in Europe?",
            "body": "Trying to decide between Stripe and Paddle. Which one is better for a solo founder? We are having issues with Stripe."
        }
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "vs")

        # workflow statement
        lead = {"post_id": "p_best_way", "title": "What does your workflow look like for Stripe billing software?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "what does your workflow look like")

        # anyone using
        lead = {"post_id": "p_anyone_using", "title": "Is anyone using Intercom for support workflow?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "anyone using")

        # looking for advice
        lead = {"post_id": "p_advice", "title": "Looking for advice on choosing a CRM software tool", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "looking for")

        # dealing with
        lead = {"post_id": "p_exp", "title": "Anyone else dealing with Paddle tax compliance software?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "anyone else dealing with")

        # suggestions for
        lead = {"post_id": "p_suggest", "title": "Any suggestions for an email parser tool?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "suggestions for")

        # comparison between
        lead = {"post_id": "p_compare", "title": "Comparison between helpdesk platforms for our startup", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "comparison between")

        # which software
        lead = {"post_id": "p_best_sw", "title": "Which software for email outreach marketing is best?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "which software")

        # best tool -> matched via looking for / tool
        lead = {"post_id": "p_best_tl", "title": "Looking for a tool to scrape Google Maps for business", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "looking for")

        # no solution for (under problem signal / tool)
        lead = {"post_id": "p_sol_for", "title": "There is no solution for database replication for our team", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "no solution for")

        # alternatives to
        lead = {"post_id": "p_alts", "title": "What are some good alternatives to Zendesk software?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "alternatives to")

        # software recommendation -> matched via recommend/software
        lead = {"post_id": "p_sw_rec", "title": "Need a B2B software recommendation for CRM integration", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "recommend")

        # manual process
        lead = {"post_id": "p_budget", "title": "We have a manual process for our startup hosting", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "manual process")

        # TikTok seller and Shopify syncing (Audit recommended)
        lead = {"post_id": "p_tiktok_sync", "title": "TikTok seller and Shopify order syncing issue", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "syncing")

        # SaaS tool renew waste (Audit recommended)
        lead = {"post_id": "p_saas_waste", "title": "Paid €6,847 last quarter to renew a SaaS tool nobody uses", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "nobody uses")

        # what's the cheapest (Part 2 Audit)
        lead = {"post_id": "p_cheapest", "title": "What's the cheapest invoicing software?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "what's the cheapest")

        # waste of budget (Part 2 Audit)
        lead = {"post_id": "p_budget_waste", "title": "Total waste of budget on TikTok ads", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "waste of budget")



    @patch("backend.lead_qualifier.logger")
    def test_filtered_logging_format(self, mock_logger):
        leads = [
            {
                "post_id": "neg_roast",
                "title": "Roast my landing page",
                "body": "Give feedback on my tool"
            }
        ]
        qualified, filtered = qualify_leads(leads)
        
        self.assertEqual(len(qualified), 0)
        self.assertEqual(len(filtered), 1)
        self.assertTrue(filtered[0]["filtered_out"])
        self.assertEqual(filtered[0]["filter_reason"], "hard_block")
        
        mock_logger.info.assert_any_call(
            "FILTERED post_id=%s reason=%s rule=%s title=%r",
            "neg_roast",
            "hard_block",
            "hard_block:title:roast my",
            "Roast my landing page"
        )

        # Test NO-SIGNAL logging formatting
        leads_no_signal = [
            {
                "post_id": "no_sig_123",
                "title": "Just a general post",
                "body": "No buying signal at all",
                "subreddit": "saas"
            }
        ]
        qualified_ns, filtered_ns = qualify_leads(leads_no_signal)
        self.assertEqual(len(qualified_ns), 0)
        self.assertEqual(len(filtered_ns), 1)
        self.assertEqual(filtered_ns[0]["filter_reason"], "no_problem_signal")
        mock_logger.info.assert_any_call(
            "FILTERED post_id=%s reason=%s rule=%s title=%r",
            "no_sig_123",
            "no_problem_signal",
            "no_problem_signal",
            "Just a general post"
        )

    def test_career_exclusions(self):
        # learn jira career discussion
        lead = {"post_id": "c_jira", "title": "Does it make sense to learn Jira in parallel to PMP?", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "career_discussion")

        # career transition
        lead = {"post_id": "c_transition", "title": "Career transition advice needed", "body": "Looking for PMP certification info"}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "career_discussion")

        # looking for mentor
        lead = {"post_id": "c_mentor", "title": "Looking for a mentor to learn CRM design", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "career_discussion")

        # available for freelance
        lead = {"post_id": "c_freelance", "title": "Expert Xero dev available for freelance projects", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "career_discussion")

    def test_self_promotion_exclusions(self):
        # feedback on my landing page
        lead = {"post_id": "sp_landing", "title": "Feedback on my landing page", "body": "I spent hours designing this dashboard."}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "self_promotion")

        # im building a tool
        lead = {"post_id": "sp_tool", "title": "Im building a tool for automated CRM logging", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "self_promotion")

    def test_tightened_rules(self):
        # scaling without problem word should fail
        lead = {"post_id": "t_scaling_fail", "title": "How to handle scaling your B2B marketing budget", "body": "We have a business agency."}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "weak_problem_signal")

        # scaling with problem word should pass
        lead = {"post_id": "t_scaling_pass", "title": "Scaling bottlenecks with our CRM database", "body": "We have a business agency."}
        passed, reason = _qualify_single(lead)
        self.assertTrue(passed)
        self.assertEqual(reason, "scaling")


    def test_founder_validation_exclusions(self):
        # looking for beta users
        lead = {"post_id": "fv_beta", "title": "Looking for beta users for our invoicing app", "body": ""}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "founder_validation")

        # validate my idea
        lead = {"post_id": "fv_validate", "title": "How to validate my idea", "body": "I have a startup idea for ecommerce."}
        passed, reason = _qualify_single(lead)
        self.assertFalse(passed)
        self.assertEqual(reason, "founder_validation")


if __name__ == "__main__":
    unittest.main()
